import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { initializeConnections } from './database/connection';
import { PostgresReportRepository } from './database/repository';
import { DefaultReportGeneratorService } from './services/report-generator';
import { createReportRoutes } from './routes/reports';
import improvementRoutes from './routes/improvement';
import progressRoutes from './routes/progress';
import engagementRoutes from './routes/engagement';
import exportRoutes from './routes/export';
import securityRoutes from './routes/security';
import privacyRoutes from './routes/privacy';
import { auditLogger, rateLimiter, inputSanitizer } from './middleware/security-middleware';
import { schedulerService } from './services/scheduler-service';
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
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security middleware
  app.use(auditLogger({
    enableAuditLogging: true,
    excludePaths: ['/health', '/metrics'],
  }));
  app.use(inputSanitizer({
    sensitiveFields: ['password', 'token', 'ssn', 'creditCard'],
  }));
  app.use(rateLimiter(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

  // Request logging middleware
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
    next();
  });

  // Initialize services
  const reportRepository = new PostgresReportRepository();
  const reportGenerator = new DefaultReportGeneratorService();

  // Start scheduler service
  schedulerService.startScheduler();

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Reporting service is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'reporting',
    });
  });

  // API routes
  app.use('/api/reports', createReportRoutes(reportGenerator, reportRepository));
  app.use('/api/reporting/improvement', improvementRoutes);
  app.use('/api/reporting/progress', progressRoutes);
  app.use('/api/reporting/engagement', engagementRoutes);
  app.use('/api/reporting/export', exportRoutes);
  app.use('/api/reporting/security', securityRoutes);
  app.use('/api/reporting/privacy', privacyRoutes);

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
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: config.nodeEnv === 'development' ? error.message : 'Internal server error',
      },
    });
  });

  return app;
};

// Graceful shutdown handler
export const setupGracefulShutdown = (server: any) => {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    // Stop scheduler service
    schedulerService.stopScheduler();
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close database connections
        const { db, redis } = await import('./database/connection');
        
        await db.end();
        logger.info('Database connection closed');
        
        await redis.quit();
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