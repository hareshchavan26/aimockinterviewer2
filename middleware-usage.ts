/**
 * Example usage of feature access middleware
 * This file demonstrates how to use the middleware in different scenarios
 */

import express from 'express';
import { UsageType, FeatureCategory } from '../types';
import { createFeatureAccessMiddleware } from '../middleware/feature-access';
import { DefaultSubscriptionService } from '../services/subscription';

// Example: Setting up middleware with a subscription service
const subscriptionService = new DefaultSubscriptionService({} as any);
const featureMiddleware = createFeatureAccessMiddleware(subscriptionService);

const router = express.Router();

// Example 1: Require specific feature access
router.post('/interviews/start',
  featureMiddleware.requireFeature('basic_interviews'),
  featureMiddleware.checkUsageLimit(UsageType.INTERVIEW_STARTED, 1),
  featureMiddleware.trackUsage(UsageType.INTERVIEW_STARTED, 1),
  async (req, res) => {
    // Start interview logic here
    res.json({ message: 'Interview started successfully' });
  }
);

// Example 2: Require premium subscription
router.get('/analytics/advanced',
  featureMiddleware.requirePremium(),
  async (req, res) => {
    // Advanced analytics logic here
    res.json({ analytics: 'advanced data' });
  }
);

// Example 3: Combined feature and usage checking
router.post('/analysis/generate',
  ...featureMiddleware.requireFeatureWithUsage({
    feature: 'advanced_analysis',
    usageType: UsageType.ANALYSIS_GENERATED,
    quantity: 1,
  }),
  async (req, res) => {
    // Generate analysis logic here
    res.json({ analysis: 'generated successfully' });
  }
);

// Example 4: Check usage without tracking (for preview/estimation)
router.get('/interviews/can-start',
  featureMiddleware.checkUsageLimit(UsageType.INTERVIEW_STARTED, 1),
  async (req, res) => {
    // Just checking if user can start interview
    res.json({ canStart: true });
  }
);

// Example 5: Multiple usage types for complex operations
router.post('/interviews/full-session',
  featureMiddleware.checkUsageLimit(UsageType.INTERVIEW_STARTED, 1),
  featureMiddleware.checkUsageLimit(UsageType.AI_QUESTION_GENERATED, 10),
  featureMiddleware.checkUsageLimit(UsageType.RECORDING_MINUTE_USED, 30),
  featureMiddleware.trackUsage(UsageType.INTERVIEW_STARTED, 1),
  featureMiddleware.trackUsage(UsageType.AI_QUESTION_GENERATED, 10),
  featureMiddleware.trackUsage(UsageType.RECORDING_MINUTE_USED, 30),
  async (req, res) => {
    // Full interview session logic here
    res.json({ session: 'started with full features' });
  }
);

// Example 6: Conditional feature access based on request
router.post('/reports/export',
  async (req: any, res, next) => {
    const format = req.body.format;
    
    // Only require premium for advanced formats
    if (format === 'advanced-pdf' || format === 'detailed-csv') {
      return featureMiddleware.requirePremium()(req, res, next);
    }
    
    // Basic export is available to all plans
    return featureMiddleware.checkUsageLimit(UsageType.REPORT_EXPORTED, 1)(req, res, next);
  },
  featureMiddleware.trackUsage(UsageType.REPORT_EXPORTED, 1),
  async (req, res) => {
    // Export logic here
    res.json({ export: 'completed' });
  }
);

// Example 7: Error handling with upgrade prompts
router.use((error: any, req: any, res: any, next: any) => {
  if (error.code === 'USAGE_LIMIT_EXCEEDED') {
    res.status(403).json({
      error: error.message,
      code: error.code,
      upgradePrompt: {
        title: 'Usage Limit Reached',
        message: 'You\'ve reached your monthly limit. Upgrade to continue using this feature.',
        ctaText: 'Upgrade Now',
        ctaUrl: '/upgrade',
      },
    });
  } else if (error.code === 'FEATURE_NOT_AVAILABLE') {
    res.status(403).json({
      error: error.message,
      code: error.code,
      upgradePrompt: {
        title: 'Premium Feature',
        message: 'This feature is available in our premium plans.',
        ctaText: 'See Plans',
        ctaUrl: '/pricing',
      },
    });
  } else {
    next(error);
  }
});

export { router as middlewareExamples };

/**
 * Example of custom middleware for specific business logic
 */
export function createInterviewMiddleware(subscriptionService: any) {
  return {
    // Check if user can start a new interview
    canStartInterview: () => [
      featureMiddleware.requireFeature('basic_interviews'),
      featureMiddleware.checkUsageLimit(UsageType.INTERVIEW_STARTED, 1),
    ],

    // Track interview completion with multiple metrics
    trackInterviewCompletion: (durationMinutes: number, questionsUsed: number) => [
      featureMiddleware.trackUsage(UsageType.INTERVIEW_COMPLETED, 1),
      featureMiddleware.trackUsage(UsageType.RECORDING_MINUTE_USED, durationMinutes),
      featureMiddleware.trackUsage(UsageType.AI_QUESTION_GENERATED, questionsUsed),
    ],

    // Check if user can access advanced features during interview
    canUseAdvancedFeatures: () => [
      featureMiddleware.requireFeature('advanced_analysis'),
      featureMiddleware.requirePremium(),
    ],
  };
}

/**
 * Example of usage enforcement in business logic
 */
export class InterviewService {
  constructor(
    private subscriptionService: any,
    private usageEnforcementService: any
  ) {}

  async startInterview(userId: string, interviewConfig: any) {
    // Get user's subscription
    const subscription = await this.subscriptionService.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription');
    }

    // Check if user can start interview
    const enforcement = await this.usageEnforcementService.enforceUsage(
      subscription.subscription.id,
      UsageType.INTERVIEW_STARTED,
      1
    );

    if (!enforcement.allowed) {
      throw new Error(enforcement.reason);
    }

    // Show warnings if any
    if (enforcement.warnings.length > 0) {
      console.log('Usage warnings:', enforcement.warnings);
    }

    // Start interview logic here...
    
    // Track usage after successful start
    await this.subscriptionService.trackUsage({
      subscriptionId: subscription.subscription.id,
      usageType: UsageType.INTERVIEW_STARTED,
      quantity: 1,
      metadata: {
        interviewType: interviewConfig.type,
        timestamp: new Date().toISOString(),
      },
    });

    return { interviewId: 'interview-123', warnings: enforcement.warnings };
  }
}