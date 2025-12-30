import { Request, Response, NextFunction } from 'express';
import {
  SubscriptionService,
  UsageType,
  FeatureCategory,
  UsageLimitExceededError,
  SubscriptionNotFoundError,
  PlanNotFoundError,
} from '../types';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  subscriptionId?: string;
}

export interface FeatureAccessOptions {
  feature?: string;
  category?: FeatureCategory;
  usageType?: UsageType;
  quantity?: number;
  requiresPremium?: boolean;
}

export class FeatureAccessMiddleware {
  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * Middleware to check if user has access to a specific feature
   */
  requireFeature(feature: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.userId;
        if (!userId) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
          });
        }

        const hasAccess = await this.subscriptionService.hasFeatureAccess(userId, feature);
        if (!hasAccess) {
          const subscription = await this.subscriptionService.getUserSubscription(userId);
          return res.status(403).json({
            error: 'Feature not available in your current plan',
            code: 'FEATURE_NOT_AVAILABLE',
            feature,
            currentPlan: subscription?.plan.name,
            upgradeRequired: true,
            suggestedPlan: await this.getSuggestedUpgrade(userId),
          });
        }

        next();
      } catch (error) {
        logger.error('Feature access check failed', { error, feature, userId: req.userId });
        res.status(500).json({
          error: 'Failed to check feature access',
          code: 'FEATURE_CHECK_ERROR',
        });
      }
    };
  }

  /**
   * Middleware to check usage limits before allowing an action
   */
  checkUsageLimit(usageType: UsageType, quantity: number = 1) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.userId;
        if (!userId) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
          });
        }

        const subscription = await this.subscriptionService.getUserSubscription(userId);
        if (!subscription) {
          return res.status(404).json({
            error: 'No active subscription found',
            code: 'NO_SUBSCRIPTION',
          });
        }

        const usageCheck = await this.subscriptionService.checkUsageLimit(
          subscription.subscription.id,
          usageType,
          quantity
        );

        if (!usageCheck.allowed) {
          return res.status(403).json({
            error: usageCheck.reason || 'Usage limit exceeded',
            code: 'USAGE_LIMIT_EXCEEDED',
            usageType,
            currentUsage: usageCheck.currentUsage,
            limit: usageCheck.limit,
            upgradeRequired: usageCheck.upgradeRequired,
            suggestedPlan: usageCheck.suggestedPlan,
          });
        }

        // Store subscription ID for later use in tracking
        req.subscriptionId = subscription.subscription.id;
        next();
      } catch (error) {
        logger.error('Usage limit check failed', { error, usageType, quantity, userId: req.userId });
        res.status(500).json({
          error: 'Failed to check usage limit',
          code: 'USAGE_CHECK_ERROR',
        });
      }
    };
  }

  /**
   * Middleware to track usage after successful action
   */
  trackUsage(usageType: UsageType, quantity: number = 1) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      // Store original res.json to intercept successful responses
      const originalJson = res.json.bind(res);
      
      res.json = function(body: any) {
        // Only track usage on successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300 && req.subscriptionId) {
          // Track usage asynchronously to avoid blocking the response
          setImmediate(async () => {
            try {
              await req.app.locals.subscriptionService.trackUsage({
                subscriptionId: req.subscriptionId!,
                usageType,
                quantity,
                metadata: {
                  endpoint: req.path,
                  method: req.method,
                  timestamp: new Date().toISOString(),
                },
              });
              logger.info('Usage tracked', {
                subscriptionId: req.subscriptionId,
                usageType,
                quantity,
                endpoint: req.path,
              });
            } catch (error) {
              logger.error('Failed to track usage', {
                error,
                subscriptionId: req.subscriptionId,
                usageType,
                quantity,
              });
            }
          });
        }
        
        return originalJson(body);
      };

      next();
    };
  }

  /**
   * Combined middleware for feature access, usage checking, and tracking
   */
  requireFeatureWithUsage(options: FeatureAccessOptions) {
    return [
      ...(options.feature ? [this.requireFeature(options.feature)] : []),
      ...(options.usageType ? [this.checkUsageLimit(options.usageType, options.quantity)] : []),
      ...(options.usageType ? [this.trackUsage(options.usageType, options.quantity)] : []),
    ];
  }

  /**
   * Middleware to check if user has premium features
   */
  requirePremium() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.userId;
        if (!userId) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED',
          });
        }

        const subscription = await this.subscriptionService.getUserSubscription(userId);
        if (!subscription) {
          return res.status(403).json({
            error: 'Premium subscription required',
            code: 'PREMIUM_REQUIRED',
            upgradeRequired: true,
            suggestedPlan: await this.getSuggestedUpgrade(userId),
          });
        }

        const isPremium = subscription.plan.tier === 'premium' || subscription.plan.tier === 'enterprise';
        if (!isPremium) {
          return res.status(403).json({
            error: 'Premium subscription required',
            code: 'PREMIUM_REQUIRED',
            currentPlan: subscription.plan.name,
            upgradeRequired: true,
            suggestedPlan: await this.getSuggestedUpgrade(userId),
          });
        }

        next();
      } catch (error) {
        logger.error('Premium access check failed', { error, userId: req.userId });
        res.status(500).json({
          error: 'Failed to check premium access',
          code: 'PREMIUM_CHECK_ERROR',
        });
      }
    };
  }

  /**
   * Middleware to add subscription context to request
   */
  addSubscriptionContext() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.userId;
        if (userId) {
          const subscription = await this.subscriptionService.getUserSubscription(userId);
          if (subscription) {
            req.subscriptionId = subscription.subscription.id;
            // Add subscription info to response headers for client-side usage
            res.setHeader('X-Subscription-Plan', subscription.plan.name);
            res.setHeader('X-Subscription-Tier', subscription.plan.tier);
            res.setHeader('X-Remaining-Interviews', subscription.remainingUsage.interviews.toString());
            res.setHeader('X-Remaining-Reports', subscription.remainingUsage.analysisReports.toString());
          }
        }
        next();
      } catch (error) {
        logger.error('Failed to add subscription context', { error, userId: req.userId });
        // Don't fail the request, just continue without context
        next();
      }
    };
  }

  private async getSuggestedUpgrade(userId: string) {
    try {
      const subscription = await this.subscriptionService.getUserSubscription(userId);
      if (!subscription) {
        // Suggest basic plan for users without subscription
        const plans = await this.subscriptionService.listPlans(true);
        return plans.find(p => p.tier === 'basic') || plans[0];
      }

      // Find next tier plan
      const plans = await this.subscriptionService.listPlans(true);
      const tierOrder = ['free', 'basic', 'premium', 'enterprise'];
      const currentTierIndex = tierOrder.indexOf(subscription.plan.tier);
      
      if (currentTierIndex < tierOrder.length - 1) {
        const nextTier = tierOrder[currentTierIndex + 1];
        return plans.find(p => p.tier === nextTier);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get suggested upgrade', { error, userId });
      return null;
    }
  }
}

// Factory function to create middleware instance
export function createFeatureAccessMiddleware(subscriptionService: SubscriptionService): FeatureAccessMiddleware {
  return new FeatureAccessMiddleware(subscriptionService);
}

// Convenience middleware functions
export function requireFeature(subscriptionService: SubscriptionService, feature: string) {
  const middleware = new FeatureAccessMiddleware(subscriptionService);
  return middleware.requireFeature(feature);
}

export function checkUsageLimit(subscriptionService: SubscriptionService, usageType: UsageType, quantity: number = 1) {
  const middleware = new FeatureAccessMiddleware(subscriptionService);
  return middleware.checkUsageLimit(usageType, quantity);
}

export function trackUsage(subscriptionService: SubscriptionService, usageType: UsageType, quantity: number = 1) {
  const middleware = new FeatureAccessMiddleware(subscriptionService);
  return middleware.trackUsage(usageType, quantity);
}

export function requirePremium(subscriptionService: SubscriptionService) {
  const middleware = new FeatureAccessMiddleware(subscriptionService);
  return middleware.requirePremium();
}