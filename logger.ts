import winston from 'winston';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which logs to print based on environment
const level = () => {
  const env = config.nodeEnv || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.splat !== undefined ? ` ${JSON.stringify(info.splat)}` : ''
    }`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logError = (message: string, error: Error, meta?: any) => {
  logger.error(message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...meta,
  });
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

// Security-focused logging helpers
export const logSecurityEvent = (event: string, userId?: string, meta?: any) => {
  logger.warn(`SECURITY: ${event}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export const logAuthEvent = (event: string, userId?: string, email?: string, meta?: any) => {
  logger.info(`AUTH: ${event}`, {
    userId,
    email: email ? email.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined, // Mask email
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export const logApiRequest = (method: string, url: string, statusCode: number, responseTime: number, userId?: string) => {
  logger.http('API Request', {
    method,
    url,
    statusCode,
    responseTime,
    userId,
    timestamp: new Date().toISOString(),
  });
};

export const logUserEvent = (event: string, userId: string, meta?: any) => {
  logger.info(`USER: ${event}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};