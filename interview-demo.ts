import { Request, Response } from 'express';
import {
  SubscriptionService,
  UsageType,
  FeatureCategory,
  UsageLimitExceededError,
  SubscriptionNotFoundError,
} from '../types';
import { UsageEnforcementService } from '../services/usage-enforcement';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  subscriptionId?: string;
}

/**
 * Demo controller to show how interview endpoints would integrate with
 * usage limits and feature gating. In the real system, this would be
 * in the interview service, but we include it here to demonstrate
 * the billing integration.
 */
export class InterviewDemoController {
  constructor(
    private subscriptionService: SubscriptionService,
    private usageEnforcementService: UsageEnforcementService
  ) {}

  /**
   * Check if user can start an interview (without actually starting one)
   */
  async canStartInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const subscription = await this.subscriptionService.getUserSubscription(userId);
      if (!subscription) {
        res.status(404).json({
          error: 'No active subscription found',
          code: 'NO_SUBSCRIPTION',
          message: 'Please subscribe to start interviews',
        });
        return;
      }

      // Check if user can start an interview
      const enforcementResult = await this.usageEnforcementService.enforceUsage(
        subscription.subscription.id,
        UsageType.INTERVIEW_STARTED,
        1
      );

      if (!enforcementResult.allowed) {
        res.status(403).json({
          error: enforcementResult.reason,
          code: 'USAGE_LIMIT_EXCEEDED',
          upgradeRequired: enforcementResult.upgradeRequired,
          suggestedActions: enforcementResult.suggestedActions,
          warnings: enforcementResult.warnings,
        });
        return;
      }

      res.json({
        canStart: true,
        subscription: {
          plan: subscription.plan.name,
          tier: subscription.plan.tier,
        },
        remainingUsage: subscription.remainingUsage,
        warnings: enforcementResult.warnings,
      });
    } catch (error) {
      logger.error('Failed to check interview start capability', { error, userId: req.userId });
      res.status(500).json({
        error: 'Failed to check interview capability',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Demo endpoint to simulate starting an interview
   * This would track usage and enforce limits
   */
  async startInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { type = 'basic' } = req.body;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const subscription = await this.subscriptionService.getUserSubscription(userId);
      if (!subscription) {
        res.status(404).json({
          error: 'No active subscription found',
          code: 'NO_SUBSCRIPTION',
        });
        return;
      }

      // Check usage limits before starting
      const enforcementResult = await this.usageEnforcementService.enforceUsage(
        subscription.subscription.id,
        UsageType.INTERVIEW_STARTED,
        1
      );

      if (!enforcementResult.allowed) {
        res.status(403).json({
          error: enforcementResult.reason,
          code: 'USAGE_LIMIT_EXCEEDED',
          upgradeRequired: enforcementResult.upgradeRequired,
          suggestedActions: enforcementResult.suggestedActions,
        });
        return;
      }

      // Track the usage
      await this.subscriptionService.trackUsage({
        subscriptionId: subscription.subscription.id,
        usageType: UsageType.INTERVIEW_STARTED,
        quantity: 1,
        metadata: {
          interviewType: type,
          startedAt: new Date().toISOString(),
        },
      });

      // Simulate interview start
      const interviewId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      res.json({
        message: 'Interview started successfully',
        interviewId,
        type,
        subscription: {
          plan: subscription.plan.name,
          tier: subscription.plan.tier,
        },
        remainingUsage: {
          interviews: subscription.remainingUsage.interviews - 1,
          analysisReports: subscription.remainingUsage.analysisReports,
          aiQuestions: subscription.remainingUsage.aiQuestions,
          recordingMinutes: subscription.remainingUsage.recordingMinutes,
          exports: subscription.remainingUsage.exports,
        },
        warnings: enforcementResult.warnings,
      });
    } catch (error) {
      logger.error('Failed to start interview', { error, userId: req.userId });
      res.status(500).json({
        error: 'Failed to start interview',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Demo endpoint for premium analytics feature
   * This demonstrates feature gating based on subscription tier
   */
  async getAdvancedAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const subscription = await this.subscriptionService.getUserSubscription(userId);
      if (!subscription) {
        res.status(403).json({
          error: 'Premium subscription required',
          code: 'PREMIUM_REQUIRED',
          upgradeRequired: true,
        });
        return;
      }

      // Check if user has access to advanced analytics
      const hasAdvancedAnalytics = subscription.plan.limits.advancedAnalytics;
      if (!hasAdvancedAnalytics) {
        // Find suggested upgrade plan
        const plans = await this.subscriptionService.listPlans(true);
        const suggestedPlan = plans.find(p => p.limits.advancedAnalytics && 
          this.getTierOrder(p.tier) > this.getTierOrder(subscription.plan.tier));

        res.status(403).json({
          error: 'Premium subscription required for advanced analytics',
          code: 'PREMIUM_REQUIRED',
          currentPlan: subscription.plan.name,
          upgradeRequired: true,
          suggestedPlan: suggestedPlan ? {
            name: suggestedPlan.name,
            tier: suggestedPlan.tier,
            price: suggestedPlan.price,
          } : null,
        });
        return;
      }

      // Return mock advanced analytics data
      res.json({
        analytics: {
          performanceTrends: [
            { date: '2024-01-01', score: 75 },
            { date: '2024-01-02', score: 78 },
            { date: '2024-01-03', score: 82 },
          ],
          strengthsWeaknesses: {
            strengths: ['Communication', 'Technical Knowledge'],
            weaknesses: ['Confidence', 'Structure'],
          },
          benchmarkComparison: {
            userScore: 82,
            industryAverage: 75,
            percentile: 78,
          },
          detailedInsights: [
            'Your communication skills have improved by 15% over the last month',
            'Consider working on answer structure using the STAR method',
            'Your technical knowledge is above industry average',
          ],
        },
        subscription: {
          plan: subscription.plan.name,
          tier: subscription.plan.tier,
        },
      });
    } catch (error) {
      logger.error('Failed to get advanced analytics', { error, userId: req.userId });
      res.status(500).json({
        error: 'Failed to get advanced analytics',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  private getTierOrder(tier: string): number {
    const order = { 'free': 0, 'basic': 1, 'premium': 2, 'enterprise': 3 };
    return order[tier as keyof typeof order] || 0;
  }
}