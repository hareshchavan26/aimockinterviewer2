import { Pool } from 'pg';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // Initialize database connection
    const pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Database connection established');

    // Create Express app
    const app = createApp(pool);

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Interview service started on port ${config.port}`, {
        port: config.port,
        environment: process.env.NODE_ENV || 'development',
        database: {
          host: config.database.host,
          port: config.database.port,
          name: config.database.name,
        },
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await pool.end();
          logger.info('Database pool closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();