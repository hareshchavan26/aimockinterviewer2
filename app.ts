import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { db, redis } from './database/connection';
import { PostgresAuthRepository } from './database/repository';
import { PostgresUserProfileRepository } from './database/user-profile-repository';
import { JWTTokenService } from './services/token';
import { BcryptPasswordService } from './services/password';
import { NodemailerEmailService } from './services/email';
import { LocalFileStorageService } from './services/file-storage';
import { AuthService } from './services/auth';
import { DefaultUserProfileService } from './services/user-profile';
import { createAuthRoutes, errorHandler } from './routes/auth';
import { createUserProfileRoutes } from './routes/user-profile';
import { 
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  createRateLimitMiddleware,
  corsMiddleware,
  securityHeadersMiddleware,
  validateContentType
} from './middleware/auth';
import { logger } from './utils/logger';

export const createApp = async () => {
  const app = express();

  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS middleware
  app.use(corsMiddleware);

  // Security headers
  app.use(securityHeadersMiddleware);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Content type validation
  app.use(validateContentType);

  // Rate limiting
  app.use(createRateLimitMiddleware(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

  // Initialize services
  const repository = new PostgresAuthRepository();
  const userProfileRepository = new PostgresUserProfileRepository();
  const tokenService = new JWTTokenService();
  const passwordService = new BcryptPasswordService();
  const emailService = new NodemailerEmailService();
  const fileStorageService = new LocalFileStorageService();
  const authService = new AuthService(repository, emailService, tokenService, passwordService);
  const userProfileService = new DefaultUserProfileService(userProfileRepository, fileStorageService);

  // Create middleware
  const authMiddleware = createAuthMiddleware(tokenService);
  const optionalAuthMiddleware = createOptionalAuthMiddleware(tokenService);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Auth service is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // API routes
  app.use('/api/auth', createAuthRoutes(authService));
  app.use('/api/user', createUserProfileRoutes(userProfileService));

  // Protected routes example
  app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({
      success: true,
      message: 'This is a protected route',
      user: {
        id: req.userId,
        email: req.userEmail,
      },
    });
  });

  // Optional auth route example
  app.get('/api/optional-auth', optionalAuthMiddleware, (req, res) => {
    res.json({
      success: true,
      message: 'This route works with or without authentication',
      user: req.userId ? {
        id: req.userId,
        email: req.userEmail,
      } : null,
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};

// Graceful shutdown handler
export const setupGracefulShutdown = (server: any) => {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await db.close();
        logger.info('Database connection closed');
        
        await redis.close();
        logger.info('Redis connection closed');
        
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error });
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    process.exit(1);
  });
};