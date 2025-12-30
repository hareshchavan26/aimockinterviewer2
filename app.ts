import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';
import { SubscriptionController } from './controllers/subscription';
import { WebhookController } from './controllers/webhook';
import { UpgradePromptController } from './controllers/upgrade-prompt';
import { InterviewDemoController } from './controllers/interview-demo';
import { DefaultSubscriptionService } from './services/subscription';
import { StripePaymentService } from './services/payment';
import { UsageEnforcementService } from './services/usage-enforcement';
import { DatabaseSubscriptionRepository } from './database/subscription-repository';
import { createFeatureAccessMiddleware } from './middleware/feature-access';

export function createApp(pool: Pool) {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);

  // Webhook endpoint needs raw body
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
  
  // JSON parsing for other endpoints
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize services
  const repository = new DatabaseSubscriptionRepository(pool);
  const paymentService = new StripePaymentService(
    repository,
    config.stripe.secretKey,
    config.stripe.webhookSecret
  );
  const subscriptionService = new DefaultSubscriptionService(repository);
  const usageEnforcementService = new UsageEnforcementService(subscriptionService);

  // Initialize middleware
  const featureAccessMiddleware = createFeatureAccessMiddleware(subscriptionService);

  // Initialize controllers
  const subscriptionController = new SubscriptionController(subscriptionService, paymentService);
  const webhookController = new WebhookController(paymentService);
  const upgradePromptController = new UpgradePromptController(subscriptionService, usageEnforcementService);
  const interviewDemoController = new InterviewDemoController(subscriptionService, usageEnforcementService);

  // Make services available to middleware
  app.locals.subscriptionService = subscriptionService;
  app.locals.usageEnforcementService = usageEnforcementService;

  // Mock authentication middleware (in real app, this would validate JWT tokens)
  app.use('/api', (req: any, res, next) => {
    // Mock user ID - in real app, extract from JWT token
    req.userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    next();
  });

  // Add subscription context to all API requests
  app.use('/api', featureAccessMiddleware.addSubscriptionContext());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Webhook routes (must be before other middleware)
  app.post('/api/webhooks/stripe', (req, res) => webhookController.handleStripeWebhook(req, res));

  // Subscription routes
  app.post('/api/subscriptions', (req, res) => subscriptionController.createSubscription(req, res));
  app.get('/api/subscriptions/:subscriptionId', (req, res) => subscriptionController.getSubscription(req, res));
  app.put('/api/subscriptions/:subscriptionId', (req, res) => subscriptionController.updateSubscription(req, res));
  app.delete('/api/subscriptions/:subscriptionId', (req, res) => subscriptionController.cancelSubscription(req, res));
  
  // User subscription routes
  app.get('/api/users/:userId/subscription', (req, res) => subscriptionController.getUserSubscription(req, res));
  
  // Usage tracking routes
  app.post('/api/usage/track', (req, res) => subscriptionController.trackUsage(req, res));
  app.get('/api/subscriptions/:subscriptionId/usage', (req, res) => subscriptionController.getCurrentUsage(req, res));
  app.get('/api/subscriptions/:subscriptionId/usage/check', (req, res) => subscriptionController.checkUsageLimit(req, res));
  
  // Usage enforcement routes
  app.get('/api/subscriptions/:subscriptionId/usage/summary', async (req, res) => {
    try {
      const summary = await usageEnforcementService.getUsageSummary(req.params.subscriptionId);
      res.json(summary);
    } catch (error) {
      logger.error('Failed to get usage summary', { error });
      res.status(500).json({ error: 'Failed to get usage summary' });
    }
  });

  app.get('/api/subscriptions/:subscriptionId/usage/warnings', async (req, res) => {
    try {
      const warnings = await usageEnforcementService.getUsageWarnings(req.params.subscriptionId);
      res.json({ warnings });
    } catch (error) {
      logger.error('Failed to get usage warnings', { error });
      res.status(500).json({ error: 'Failed to get usage warnings' });
    }
  });

  // Upgrade prompt routes
  app.get('/api/users/:userId/upgrade/recommendation', (req, res) => upgradePromptController.getUpgradeRecommendation(req, res));
  app.get('/api/users/:userId/upgrade/should-show', (req, res) => upgradePromptController.shouldShowUpgradePrompt(req, res));
  app.get('/api/subscriptions/:subscriptionId/upgrade/suggestions', (req, res) => upgradePromptController.getUsageBasedSuggestions(req, res));
  app.get('/api/users/:userId/upgrade/plan-comparison', (req, res) => upgradePromptController.getPlanComparison(req, res));
  app.post('/api/upgrade/track-interaction', (req, res) => upgradePromptController.trackUpgradePromptInteraction(req, res));
  
  // Payment retry routes
  app.post('/api/subscriptions/:subscriptionId/retry-payment', (req, res) => subscriptionController.retryFailedPayment(req, res));

  // Demo interview routes (showing integration with usage limits and feature gating)
  app.get('/api/interviews/can-start', (req, res) => interviewDemoController.canStartInterview(req, res));
  app.post('/api/interviews/start', (req, res) => interviewDemoController.startInterview(req, res));
  app.get('/api/analytics/advanced', (req, res) => interviewDemoController.getAdvancedAnalytics(req, res));

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error, url: req.url, method: req.method });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      code: 'NOT_FOUND',
    });
  });

  return app;
}