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
      logger.info(`Billing service started on port ${config.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        pool.end(() => {
          logger.info('Server and database connections closed');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        pool.end(() => {
          logger.info('Server and database connections closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();