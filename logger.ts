import winston from 'winston';

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'billing-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Billing-specific logging functions
export const logSubscriptionEvent = (event: string, subscriptionId: string, metadata?: any) => {
  logger.info('Subscription event', {
    event,
    subscriptionId,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

export const logUsageEvent = (event: string, subscriptionId: string, usageType: string, quantity: number, metadata?: any) => {
  logger.info('Usage event', {
    event,
    subscriptionId,
    usageType,
    quantity,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

export const logPaymentEvent = (event: string, customerId?: string, subscriptionId?: string, metadata?: any) => {
  logger.info('Payment event', {
    event,
    customerId,
    subscriptionId,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

export const logBillingError = (error: Error, context: string, metadata?: any) => {
  logger.error('Billing error', {
    error: error.message,
    stack: error.stack,
    context,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};