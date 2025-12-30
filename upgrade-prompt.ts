import { Request, Response } from 'express';
import {
  SubscriptionService,
  SubscriptionTier,
  UsageType,
  SubscriptionError,
} from '../types';
import { UsageEnforcementService } from '../services/usage-enforcement';
import { logger } from '../utils/logger';

export interface UpgradePromptRequest extends Request {
  userId?: string;
  subscriptionId?: string;
}

export interface UpgradeRecommendation {
  currentPlan: {
    name: string;
    tier: SubscriptionTier;
    price: number;
  };
  recommendedPlan: {
    name: string;
    tier: SubscriptionTier;
    price: number;
    benefits: string[];
  };
  reasons: string[];
  urgency: 'low' | 'medium' | 'high';
  savings?: {
    monthly: number;
    yearly: number;
  };
}

export class UpgradePromptController {
  constructor(
    private subscriptionService: SubscriptionService,
    private usageEnforcementService: UsageEnforcementService
  ) {}

  /**
   * Get personalized upgrade recommendations
   */
  async getUpgradeRecommendation(req: UpgradePromptRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || req.params.userId;
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'USER_ID_REQUIRED',
        });
        return;
      }

      const subscription = await this.subscriptionService.getUserSubscription(userId);
      if (!subscription) {
        // User has no subscription, recommend basic plan
        const plans = await this.subscriptionService.listPlans(true);
        const basicPlan = plans.find(p => p.tier === SubscriptionTier.BASIC);
        
        if (basicPlan) {
          const recommendation: UpgradeRecommendation = {
            currentPlan: {
              name: 'Free',
              tier: SubscriptionTier.FREE,
              price: 0,
            },
            recommendedPlan: {
              name: basicPlan.name,
              tier: basicPlan.tier,
              price: basicPlan.price,
              benefits: this.getPlanBenefits(basicPlan.tier),
            },
            reasons: [
              'Unlock more interview sessions per month',
              'Access to AI-generated questions',
              'Detailed performance reports',
              'Export capabilities',
            ],
            urgency: 'medium',
          };
          
          res.json(recommendation);
          return;
        }
      }

      // Get usage warnings and create recommendation
      const warnings = await this.usageEnforcementService.getUsageWarnings(subscription!.subscription.id);
      const recommendation = await this.createUpgradeRecommendation(subscription!, warnings);
      
      res.json(recommendation);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Check if upgrade prompt should be shown
   */
  async shouldShowUpgradePrompt(req: UpgradePromptRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || req.params.userId;
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'USER_ID_REQUIRED',
        });
        return;
      }

      const subscription = await this.subscriptionService.getUserSubscription(userId);
      if (!subscription) {
        res.json({ shouldShow: true, reason: 'no_subscription' });
        return;
      }

      const warnings = await this.usageEnforcementService.getUsageWarnings(subscription.subscription.id);
      const hasHighUsage = warnings.some(w => w.percentageUsed >= 80);
      const hasUpgradeRecommendation = warnings.some(w => w.upgradeRecommended);
      
      // Check if user is on free plan with significant usage
      const isFreePlan = subscription.plan.tier === SubscriptionTier.FREE;
      const hasSignificantUsage = subscription.usage.interviewsUsed >= 2 || 
                                 subscription.usage.analysisReportsGenerated >= 2;

      const shouldShow = hasHighUsage || hasUpgradeRecommendation || 
                        (isFreePlan && hasSignificantUsage);

      res.json({
        shouldShow,
        reason: hasHighUsage ? 'high_usage' : 
                hasUpgradeRecommendation ? 'upgrade_recommended' :
                (isFreePlan && hasSignificantUsage) ? 'free_plan_usage' : 'none',
        urgency: hasHighUsage ? 'high' : 'medium',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get usage-based upgrade suggestions
   */
  async getUsageBasedSuggestions(req: UpgradePromptRequest, res: Response): Promise<void> {
    try {
      const subscriptionId = req.subscriptionId || req.params.subscriptionId;
      if (!subscriptionId) {
        res.status(400).json({
          error: 'Subscription ID is required',
          code: 'SUBSCRIPTION_ID_REQUIRED',
        });
        return;
      }

      const usageSummary = await this.usageEnforcementService.getUsageSummary(subscriptionId);
      const suggestions = this.generateUsageBasedSuggestions(usageSummary);
      
      res.json({
        usageSummary,
        suggestions,
        upgradeRecommended: suggestions.some(s => s.priority === 'high'),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get plan comparison for upgrade decision
   */
  async getPlanComparison(req: UpgradePromptRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || req.params.userId;
      const targetTier = req.query.targetTier as SubscriptionTier;
      
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'USER_ID_REQUIRED',
        });
        return;
      }

      const subscription = await this.subscriptionService.getUserSubscription(userId);
      const plans = await this.subscriptionService.listPlans(true);
      
      const currentPlan = subscription?.plan || { tier: SubscriptionTier.FREE, name: 'Free', price: 0 };
      const targetPlan = targetTier ? 
        plans.find(p => p.tier === targetTier) :
        this.getRecommendedPlan(currentPlan.tier, plans);

      if (!targetPlan) {
        res.status(404).json({
          error: 'Target plan not found',
          code: 'PLAN_NOT_FOUND',
        });
        return;
      }

      const comparison = {
        current: {
          ...currentPlan,
          features: this.getPlanFeatures(currentPlan.tier),
          limits: this.getPlanLimits(currentPlan.tier),
        },
        target: {
          ...targetPlan,
          features: this.getPlanFeatures(targetPlan.tier),
          limits: this.getPlanLimits(targetPlan.tier),
        },
        differences: this.getPlanDifferences(currentPlan.tier, targetPlan.tier),
        costDifference: targetPlan.price - (currentPlan.price || 0),
      };

      res.json(comparison);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Track upgrade prompt interactions
   */
  async trackUpgradePromptInteraction(req: UpgradePromptRequest, res: Response): Promise<void> {
    try {
      const { action, planTier, source } = req.body;
      const userId = req.userId;

      if (!userId || !action) {
        res.status(400).json({
          error: 'User ID and action are required',
          code: 'MISSING_REQUIRED_FIELDS',
        });
        return;
      }

      // Log the interaction for analytics
      logger.info('Upgrade prompt interaction', {
        userId,
        action, // 'viewed', 'dismissed', 'clicked_upgrade', 'completed_upgrade'
        planTier,
        source, // 'usage_limit', 'dashboard', 'feature_gate', etc.
        timestamp: new Date().toISOString(),
      });

      // You could also store this in a database for analytics
      // await this.analyticsService.trackUpgradePromptInteraction(...)

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private async createUpgradeRecommendation(
    subscription: any,
    warnings: any[]
  ): Promise<UpgradeRecommendation> {
    const plans = await this.subscriptionService.listPlans(true);
    const currentTier = subscription.plan.tier;
    const recommendedPlan = this.getRecommendedPlan(currentTier, plans);

    if (!recommendedPlan) {
      throw new Error('No upgrade plan available');
    }

    const reasons = this.getUpgradeReasons(subscription, warnings);
    const urgency = this.calculateUrgency(warnings);

    return {
      currentPlan: {
        name: subscription.plan.name,
        tier: subscription.plan.tier,
        price: subscription.plan.price,
      },
      recommendedPlan: {
        name: recommendedPlan.name,
        tier: recommendedPlan.tier,
        price: recommendedPlan.price,
        benefits: this.getPlanBenefits(recommendedPlan.tier),
      },
      reasons,
      urgency,
      savings: this.calculateSavings(subscription.plan.price, recommendedPlan.price),
    };
  }

  private getRecommendedPlan(currentTier: SubscriptionTier, plans: any[]) {
    const tierOrder = [SubscriptionTier.FREE, SubscriptionTier.BASIC, SubscriptionTier.PREMIUM, SubscriptionTier.ENTERPRISE];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    if (currentIndex < tierOrder.length - 1) {
      const nextTier = tierOrder[currentIndex + 1];
      return plans.find(p => p.tier === nextTier);
    }
    
    return null;
  }

  private getUpgradeReasons(subscription: any, warnings: any[]): string[] {
    const reasons: string[] = [];
    
    warnings.forEach(warning => {
      switch (warning.usageType) {
        case UsageType.INTERVIEW_STARTED:
          reasons.push(`You've used ${warning.percentageUsed.toFixed(0)}% of your interview limit`);
          break;
        case UsageType.ANALYSIS_GENERATED:
          reasons.push(`You're approaching your analysis report limit`);
          break;
        case UsageType.RECORDING_MINUTE_USED:
          reasons.push(`You're running low on recording minutes`);
          break;
      }
    });

    // Add tier-specific reasons
    if (subscription.plan.tier === SubscriptionTier.FREE) {
      reasons.push('Unlock unlimited AI-generated questions');
      reasons.push('Access advanced analytics and insights');
    }

    return reasons;
  }

  private calculateUrgency(warnings: any[]): 'low' | 'medium' | 'high' {
    const maxUsage = Math.max(...warnings.map(w => w.percentageUsed), 0);
    
    if (maxUsage >= 95) return 'high';
    if (maxUsage >= 80) return 'medium';
    return 'low';
  }

  private calculateSavings(currentPrice: number, targetPrice: number) {
    const monthlyDifference = targetPrice - currentPrice;
    return {
      monthly: monthlyDifference,
      yearly: monthlyDifference * 12 * 0.8, // Assume 20% yearly discount
    };
  }

  private getPlanBenefits(tier: SubscriptionTier): string[] {
    switch (tier) {
      case SubscriptionTier.BASIC:
        return [
          '15 interviews per month',
          'AI-generated questions',
          'Detailed performance reports',
          'Export to PDF/CSV',
          '5 hours of recording',
        ];
      case SubscriptionTier.PREMIUM:
        return [
          '100 interviews per month',
          'Advanced multi-modal analysis',
          'Unlimited AI questions',
          'Priority support',
          '16+ hours of recording',
          'Custom branding',
        ];
      case SubscriptionTier.ENTERPRISE:
        return [
          'Unlimited interviews',
          'Advanced analytics dashboard',
          'Team management',
          'API access',
          'Dedicated support',
          'Custom integrations',
        ];
      default:
        return [];
    }
  }

  private getPlanFeatures(tier: SubscriptionTier): string[] {
    // This would typically come from the plan data
    return this.getPlanBenefits(tier);
  }

  private getPlanLimits(tier: SubscriptionTier) {
    const limits = {
      [SubscriptionTier.FREE]: {
        interviews: 3,
        reports: 3,
        recording: 60,
        exports: 1,
      },
      [SubscriptionTier.BASIC]: {
        interviews: 15,
        reports: 15,
        recording: 300,
        exports: 10,
      },
      [SubscriptionTier.PREMIUM]: {
        interviews: 100,
        reports: 100,
        recording: 1000,
        exports: 50,
      },
      [SubscriptionTier.ENTERPRISE]: {
        interviews: 1000,
        reports: 1000,
        recording: 5000,
        exports: 500,
      },
    };

    return limits[tier] || limits[SubscriptionTier.FREE];
  }

  private getPlanDifferences(currentTier: SubscriptionTier, targetTier: SubscriptionTier) {
    const currentLimits = this.getPlanLimits(currentTier);
    const targetLimits = this.getPlanLimits(targetTier);

    return {
      interviews: targetLimits.interviews - currentLimits.interviews,
      reports: targetLimits.reports - currentLimits.reports,
      recording: targetLimits.recording - currentLimits.recording,
      exports: targetLimits.exports - currentLimits.exports,
    };
  }

  private generateUsageBasedSuggestions(usageSummary: any) {
    const suggestions: Array<{
      type: string;
      message: string;
      priority: string;
      action: string;
    }> = [];

    usageSummary.usage.forEach((usage: any) => {
      if (usage.percentageUsed >= 90) {
        suggestions.push({
          type: 'upgrade',
          message: `You're at ${usage.percentageUsed.toFixed(0)}% of your ${usage.usageType} limit`,
          priority: 'high',
          action: 'Upgrade now to avoid service interruption',
        });
      } else if (usage.percentageUsed >= 75) {
        suggestions.push({
          type: 'warning',
          message: `You've used ${usage.percentageUsed.toFixed(0)}% of your ${usage.usageType} limit`,
          priority: 'medium',
          action: 'Consider upgrading before you hit the limit',
        });
      }
    });

    return suggestions;
  }

  private handleError(error: any, res: Response): void {
    logger.error('Upgrade prompt controller error', { error });

    if (error instanceof SubscriptionError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}