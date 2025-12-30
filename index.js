import { createApp, setupGracefulShutdown } from './app';
import { redis } from './database/connection';
import { config } from './config';
import { logger } from './utils/logger';
const startServer = async () => {
    try {
        logger.info('Starting AI Interview Platform - Authentication Service');
        // Initialize database connections
        logger.info('Connecting to database...');
        // Database connection is initialized when first used
        logger.info('Connecting to Redis...');
        await redis.connect();
        // Create Express app
        const app = await createApp();
        // Start server
        const server = app.listen(config.port, () => {
            logger.info(`Auth service listening on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`Base URL: ${config.baseUrl}`);
        });
        // Setup graceful shutdown
        setupGracefulShutdown(server);
        logger.info('Auth service started successfully');
    }
    catch (error) {
        logger.error('Failed to start auth service', { error });
        process.exit(1);
    }
};
// Start the server
startServer();
