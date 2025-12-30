import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

// PostgreSQL connection
export const db = new Pool({
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

// Redis connection
export const redis = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
  database: config.redis.db,
});

// Database connection handlers
db.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

db.on('error', (err) => {
  logger.error('PostgreSQL connection error', { error: err });
});

// Redis connection handlers
redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err });
});

// Initialize connections
export const initializeConnections = async () => {
  try {
    // Test database connection
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection verified');

    // Connect to Redis
    await redis.connect();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to initialize database connections', { error });
    throw error;
  }
};