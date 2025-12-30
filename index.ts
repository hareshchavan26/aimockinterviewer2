import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.REPORTING_PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'ai_interview_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  // Service URLs
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    interview: process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3003',
    analysis: process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3005',
  },
  
  // Report generation settings
  reporting: {
    cacheExpirationMinutes: parseInt(process.env.REPORT_CACHE_EXPIRATION || '60', 10),
    maxReportsPerUser: parseInt(process.env.MAX_REPORTS_PER_USER || '100', 10),
    reportRetentionDays: parseInt(process.env.REPORT_RETENTION_DAYS || '90', 10),
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};