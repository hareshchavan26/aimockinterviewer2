import {
  SubscriptionService,
  UsageType,
  SubscriptionTier,
  UsageCheckResponse,
  UsageLimitExceededError,
  SubscriptionNotFoundError,
  PlanNotFoundError,
} from '../types';
import { logger } from '../utils/logger';

export interface UsageEnforcementRule {
  usageType: UsageType;
  tierLimits: Record<SubscriptionTier, number>;
  resetPeriod: 'monthly' | 'daily' | 'per_session';
  gracePeriod?: number; // Allow this many over the limit before hard blocking
  warningThreshold?: number; // Warn when usage reaches this percentage of limit
}

export interface UsageWarning {
  usageType: UsageType;
  currentUsage: number;
  limit: number;
  percentageUsed: number;
  message: string;
  upgradeRecommended: boolean;
}

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  warnings: UsageWarning[];
  upgradeRequired: boolean;
  suggestedActions: string[];
}

export class UsageEnforcementService {
  private enforcementRules: UsageEnforcementRule[] = [
    {
      usageType: UsageType.INTERVIEW_STARTED,
      tierLimits: {
        [SubscriptionTier.FREE]: 3,
        [SubscriptionTier.BASIC]: 15,
        [SubscriptionTier.PREMIUM]: 100,
        [SubscriptionTier.ENTERPRISE]: 1000,
      },
      resetPeriod: 'monthly',
      gracePeriod: 1,
      warningThreshold: 0.8,
    },
    {
      usageType: UsageType.ANALYSIS_GENERATED,
      tierLimits: {
        [SubscriptionTier.FREE]: 3,
        [SubscriptionTier.BASIC]: 15,
        [SubscriptionTier.PREMIUM]: 100,
        [SubscriptionTier.ENTERPRISE]: 1000,
      },
      resetPeriod: 'monthly',
      warningThreshold: 0.9,
    },
    {
      usageType: UsageType.AI_QUESTION_GENERATED,
      tierLimits: {
        [SubscriptionTier.FREE]: 5,
        [SubscriptionTier.BASIC]: 15,
        [SubscriptionTier.PREMIUM]: 50,
        [SubscriptionTier.ENTERPRISE]: 200,
      },
      resetPeriod: 'per_session',
      warningThreshold: 0.8,
    },
    {
      usageType: UsageType.RECORDING_MINUTE_USED,
      tierLimits: {
        [SubscriptionTier.FREE]: 60,
        [SubscriptionTier.BASIC]: 300,
        [SubscriptionTier.PREMIUM]: 1000,
        [SubscriptionTier.ENTERPRISE]: 5000,
      },
      resetPeriod: 'monthly',
      warningThreshold: 0.85,
    },
    {
      usageType: UsageType.REPORT_EXPORTED,
      tierLimits: {
        [SubscriptionTier.FREE]: 1,
        [SubscriptionTier.BASIC]: 10,
        [SubscriptionTier.PREMIUM]: 50,
        [SubscriptionTier.ENTERPRISE]: 500,
      },
      resetPeriod: 'monthly',
      warningThreshold: 0.9,
    },
  ];

  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * Comprehensive usage enforcement check with warnings and suggestions
   */
  async enforceUsage(
    subscriptionId: string,
    usageType: UsageType,
    requestedQuantity: number = 1
  ): Promise<EnforcementResult> {
    try {
      const subscription = await this.subscriptionService.getSubscription(subscriptionId);
      const rule = this.getEnforcementRule(usageType);
      
      if (!rule) {
        // No enforcement rule, allow by default
        return {
          allowed: true,
          warnings: [],
          upgradeRequired: false,
          suggestedActions: [],
        };
      }

      const limit = rule.tierLimits[subscription.plan.tier as SubscriptionTier];
      const currentUsage = this.getCurrentUsageForType(subscription.usage, usageType);
      
      // Check if usage would exceed limit
      const wouldExceedLimit = (currentUsage + requestedQuantity) > limit;
      const wouldExceedGracePeriod = rule.gracePeriod 
        ? (currentUsage + requestedQuantity) > (limit + rule.gracePeriod)
        : wouldExceedLimit;

      // Generate warnings
      const warnings = this.generateWarnings(subscription.plan.tier as SubscriptionTier, usageType, currentUsage, limit, rule);
      
      // Determine if upgrade is required
      const upgradeRequired = wouldExceedGracePeriod || (wouldExceedLimit && !rule.gracePeriod);
      
      // Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(
        subscription.plan.tier as SubscriptionTier,
        usageType,
        currentUsage,
        limit,
        upgradeRequired
      );

      if (wouldExceedGracePeriod) {
        return {
          allowed: false,
          reason: `Usage limit exceeded for ${usageType}. Current: ${currentUsage}, Limit: ${limit}, Requested: ${requestedQuantity}`,
          warnings,
          upgradeRequired: true,
          suggestedActions,
        };
      }

      if (wouldExceedLimit && rule.gracePeriod) {
        warnings.push({
          usageType,
          currentUsage,
          limit,
          percentageUsed: (currentUsage / limit) * 100,
          message: `You are in the grace period for ${usageType}. Consider upgrading to avoid service interruption.`,
          upgradeRecommended: true,
        });
      }

      return {
        allowed: true,
        warnings,
        upgradeRequired: false,
        suggestedActions,
      };
    } catch (error) {
      logger.error('Usage enforcement failed', { error, subscriptionId, usageType, requestedQuantity });
      throw error;
    }
  }

  /**
   * Check multiple usage types at once (useful for complex operations)
   */
  async enforceMultipleUsage(
    subscriptionId: string,
    usageRequests: Array<{ usageType: UsageType; quantity: number }>
  ): Promise<EnforcementResult> {
    const results = await Promise.all(
      usageRequests.map(req => this.enforceUsage(subscriptionId, req.usageType, req.quantity))
    );

    // Combine results
    const allowed = results.every(r => r.allowed);
    const warnings = results.flatMap(r => r.warnings);
    const upgradeRequired = results.some(r => r.upgradeRequired);
    const suggestedActions = [...new Set(results.flatMap(r => r.suggestedActions))];
    const reasons = results.filter(r => !r.allowed).map(r => r.reason).filter(Boolean);

    return {
      allowed,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      warnings,
      upgradeRequired,
      suggestedActions,
    };
  }

  /**
   * Get usage warnings for a subscription (without attempting to use)
   */
  async getUsageWarnings(subscriptionId: string): Promise<UsageWarning[]> {
    try {
      const subscription = await this.subscriptionService.getSubscription(subscriptionId);
      const warnings: UsageWarning[] = [];

      for (const rule of this.enforcementRules) {
        const limit = rule.tierLimits[subscription.plan.tier as SubscriptionTier];
        const currentUsage = this.getCurrentUsageForType(subscription.usage, rule.usageType);
        
        const ruleWarnings = this.generateWarnings(
          subscription.plan.tier as SubscriptionTier,
          rule.usageType,
          currentUsage,
          limit,
          rule
        );
        
        warnings.push(...ruleWarnings);
      }

      return warnings;
    } catch (error) {
      logger.error('Failed to get usage warnings', { error, subscriptionId });
      return [];
    }
  }

  /**
   * Get usage summary for dashboard display
   */
  async getUsageSummary(subscriptionId: string) {
    try {
      const subscription = await this.subscriptionService.getSubscription(subscriptionId);
      const summary = [];

      for (const rule of this.enforcementRules) {
        const limit = rule.tierLimits[subscription.plan.tier as SubscriptionTier];
        const currentUsage = this.getCurrentUsageForType(subscription.usage, rule.usageType);
        const percentageUsed = (currentUsage / limit) * 100;

        summary.push({
          usageType: rule.usageType,
          currentUsage,
          limit,
          percentageUsed,
          resetPeriod: rule.resetPeriod,
          status: this.getUsageStatus(percentageUsed, rule.warningThreshold),
        });
      }

      return {
        subscription: subscription.subscription,
        plan: subscription.plan,
        usage: summary,
        warnings: await this.getUsageWarnings(subscriptionId),
      };
    } catch (error) {
      logger.error('Failed to get usage summary', { error, subscriptionId });
      throw error;
    }
  }

  private getEnforcementRule(usageType: UsageType): UsageEnforcementRule | undefined {
    return this.enforcementRules.find(rule => rule.usageType === usageType);
  }

  private getCurrentUsageForType(usage: any, usageType: UsageType): number {
    switch (usageType) {
      case UsageType.INTERVIEW_STARTED:
      case UsageType.INTERVIEW_COMPLETED:
        return usage.interviewsUsed || 0;
      case UsageType.ANALYSIS_GENERATED:
        return usage.analysisReportsGenerated || 0;
      case UsageType.AI_QUESTION_GENERATED:
        return usage.aiQuestionsUsed || 0;
      case UsageType.RECORDING_MINUTE_USED:
        return usage.recordingMinutesUsed || 0;
      case UsageType.REPORT_EXPORTED:
        return usage.exportCount || 0;
      default:
        return 0;
    }
  }

  private generateWarnings(
    tier: SubscriptionTier,
    usageType: UsageType,
    currentUsage: number,
    limit: number,
    rule: UsageEnforcementRule
  ): UsageWarning[] {
    const warnings: UsageWarning[] = [];
    const percentageUsed = (currentUsage / limit) * 100;

    if (rule.warningThreshold && percentageUsed >= (rule.warningThreshold * 100)) {
      warnings.push({
        usageType,
        currentUsage,
        limit,
        percentageUsed,
        message: `You've used ${percentageUsed.toFixed(1)}% of your ${usageType} limit for this ${rule.resetPeriod}.`,
        upgradeRecommended: percentageUsed >= 90,
      });
    }

    return warnings;
  }

  private generateSuggestedActions(
    tier: SubscriptionTier,
    usageType: UsageType,
    currentUsage: number,
    limit: number,
    upgradeRequired: boolean
  ): string[] {
    const actions: string[] = [];

    if (upgradeRequired) {
      const nextTier = this.getNextTier(tier);
      if (nextTier) {
        actions.push(`Upgrade to ${nextTier} plan for higher limits`);
      }
    }

    const percentageUsed = (currentUsage / limit) * 100;
    
    if (percentageUsed >= 80) {
      switch (usageType) {
        case UsageType.INTERVIEW_STARTED:
          actions.push('Consider scheduling interviews more efficiently');
          actions.push('Review completed interviews to maximize learning');
          break;
        case UsageType.ANALYSIS_GENERATED:
          actions.push('Focus on key interviews for detailed analysis');
          break;
        case UsageType.AI_QUESTION_GENERATED:
          actions.push('Use AI questions strategically for maximum impact');
          break;
        case UsageType.RECORDING_MINUTE_USED:
          actions.push('Keep interviews concise and focused');
          actions.push('Consider shorter practice sessions');
          break;
        case UsageType.REPORT_EXPORTED:
          actions.push('Export reports for your most important interviews');
          break;
      }
    }

    return actions;
  }

  private getNextTier(currentTier: SubscriptionTier): string | null {
    switch (currentTier) {
      case SubscriptionTier.FREE:
        return 'Basic';
      case SubscriptionTier.BASIC:
        return 'Premium';
      case SubscriptionTier.PREMIUM:
        return 'Enterprise';
      default:
        return null;
    }
  }

  private getUsageStatus(percentageUsed: number, warningThreshold?: number): 'normal' | 'warning' | 'critical' {
    if (percentageUsed >= 95) return 'critical';
    if (warningThreshold && percentageUsed >= (warningThreshold * 100)) return 'warning';
    return 'normal';
  }
}