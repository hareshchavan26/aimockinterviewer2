import * as fc from 'fast-check';
import { DefaultSubscriptionService } from '../services/subscription';
import {
  SubscriptionPlan,
  UserSubscription,
  UsageMetrics,
  SubscriptionRepository,
  CreatePlanRequest,
  CreateSubscriptionRequest,
  SubscriptionTier,
  SubscriptionStatus,
  BillingInterval,
  UsageType,
  NotFoundError,
  ConflictError,
  PlanNotFoundError,
  SubscriptionNotFoundError,
  UsageLimitExceededError,
  ValidationError,
} from '../types';

// Import the mock repository from the basic test file
class MockSubscriptionRepository implements SubscriptionRepository {
  private plans: Map<string, SubscriptionPlan> = new Map();
  private subscriptions: Map<string, UserSubscription> = new Map();
  private usage: Map<string, UsageMetrics> = new Map();

  async createPlan(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    // Check for duplicate name
    for (const plan of this.plans.values()) {
      if (plan.name === planData.name) {
        throw new ConflictError(`Plan with name '${planData.name}' already exists`);
      }
    }

    const plan: SubscriptionPlan = {
      id: crypto.randomUUID(),
      name: planData.name!,
      description: planData.description || '',
      tier: planData.tier!,
      price: planData.price!,
      currency: planData.currency || 'usd',
      billingInterval: planData.billingInterval!,
      features: planData.features || [],
      limits: planData.limits!,
      stripeProductId: planData.stripeProductId,
      stripePriceId: planData.stripePriceId,
      isActive: planData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  async findPlanById(planId: string): Promise<SubscriptionPlan | null> {
    return this.plans.get(planId) || null;
  }

  async findPlanByTier(tier: SubscriptionTier): Promise<SubscriptionPlan | null> {
    for (const plan of this.plans.values()) {
      if (plan.tier === tier && plan.isActive) {
        return plan;
      }
    }
    return null;
  }

  async updatePlan(planId: string, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    const updatedPlan = { ...plan, ...planData, updatedAt: new Date() };
    this.plans.set(planId, updatedPlan);
    return updatedPlan;
  }

  async deletePlan(planId: string): Promise<void> {
    if (!this.plans.has(planId)) {
      throw new NotFoundError('Plan not found');
    }
    this.plans.delete(planId);
  }

  async listPlans(activeOnly: boolean = false): Promise<SubscriptionPlan[]> {
    const plans = Array.from(this.plans.values());
    return activeOnly ? plans.filter(p => p.isActive) : plans;
  }

  async createSubscription(subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    // Check for existing active subscription
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === subscriptionData.userId && 
          (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIALING)) {
        throw new ConflictError('User already has an active subscription');
      }
    }

    const subscription: UserSubscription = {
      id: crypto.randomUUID(),
      userId: subscriptionData.userId!,
      planId: subscriptionData.planId!,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
      stripeCustomerId: subscriptionData.stripeCustomerId,
      status: subscriptionData.status || SubscriptionStatus.ACTIVE,
      currentPeriodStart: subscriptionData.currentPeriodStart || new Date(),
      currentPeriodEnd: subscriptionData.currentPeriodEnd!,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
      canceledAt: subscriptionData.canceledAt,
      trialStart: subscriptionData.trialStart,
      trialEnd: subscriptionData.trialEnd,
      usage: {} as UsageMetrics,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscription.id, subscription);

    // Create initial usage metrics
    const usage: UsageMetrics = {
      id: crypto.randomUUID(),
      subscriptionId: subscription.id,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      interviewsUsed: 0,
      analysisReportsGenerated: 0,
      aiQuestionsUsed: 0,
      recordingMinutesUsed: 0,
      exportCount: 0,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.usage.set(subscription.id, usage);
    return subscription;
  }

  async findSubscriptionById(subscriptionId: string): Promise<UserSubscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async findSubscriptionByUserId(userId: string): Promise<UserSubscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId) {
        return subscription;
      }
    }
    return null;
  }

  async findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.stripeSubscriptionId === stripeSubscriptionId) {
        return subscription;
      }
    }
    return null;
  }

  async updateSubscription(subscriptionId: string, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const updatedSubscription = { ...subscription, ...subscriptionData, updatedAt: new Date() };
    this.subscriptions.set(subscriptionId, updatedSubscription);
    return updatedSubscription;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    if (!this.subscriptions.has(subscriptionId)) {
      throw new NotFoundError('Subscription not found');
    }
    this.subscriptions.delete(subscriptionId);
    this.usage.delete(subscriptionId);
  }

  async createUsageMetrics(usageData: Partial<UsageMetrics>): Promise<UsageMetrics> {
    const usage: UsageMetrics = {
      id: crypto.randomUUID(),
      subscriptionId: usageData.subscriptionId!,
      periodStart: usageData.periodStart!,
      periodEnd: usageData.periodEnd!,
      interviewsUsed: usageData.interviewsUsed || 0,
      analysisReportsGenerated: usageData.analysisReportsGenerated || 0,
      aiQuestionsUsed: usageData.aiQuestionsUsed || 0,
      recordingMinutesUsed: usageData.recordingMinutesUsed || 0,
      exportCount: usageData.exportCount || 0,
      lastResetAt: usageData.lastResetAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.usage.set(usage.subscriptionId, usage);
    return usage;
  }

  async findUsageBySubscriptionId(subscriptionId: string): Promise<UsageMetrics | null> {
    return this.usage.get(subscriptionId) || null;
  }

  async updateUsage(subscriptionId: string, usageData: Partial<UsageMetrics>): Promise<UsageMetrics> {
    const usage = this.usage.get(subscriptionId);
    if (!usage) {
      throw new NotFoundError('Usage metrics not found');
    }

    const updatedUsage = { ...usage, ...usageData, updatedAt: new Date() };
    this.usage.set(subscriptionId, updatedUsage);
    return updatedUsage;
  }

  async resetUsage(subscriptionId: string, periodStart: Date, periodEnd: Date): Promise<UsageMetrics> {
    const usage: UsageMetrics = {
      id: crypto.randomUUID(),
      subscriptionId,
      periodStart,
      periodEnd,
      interviewsUsed: 0,
      analysisReportsGenerated: 0,
      aiQuestionsUsed: 0,
      recordingMinutesUsed: 0,
      exportCount: 0,
      lastResetAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.usage.set(subscriptionId, usage);
    return usage;
  }

  async trackUsage(subscriptionId: string, usageType: UsageType, quantity: number): Promise<void> {
    const usage = this.usage.get(subscriptionId);
    if (!usage) {
      throw new NotFoundError('Usage metrics not found');
    }

    switch (usageType) {
      case UsageType.INTERVIEW_STARTED:
      case UsageType.INTERVIEW_COMPLETED:
        usage.interviewsUsed += quantity;
        break;
      case UsageType.ANALYSIS_GENERATED:
        usage.analysisReportsGenerated += quantity;
        break;
      case UsageType.AI_QUESTION_GENERATED:
        usage.aiQuestionsUsed += quantity;
        break;
      case UsageType.RECORDING_MINUTE_USED:
        usage.recordingMinutesUsed += quantity;
        break;
      case UsageType.REPORT_EXPORTED:
        usage.exportCount += quantity;
        break;
    }

    usage.updatedAt = new Date();
    this.usage.set(subscriptionId, usage);
  }

  async getCurrentUsage(subscriptionId: string): Promise<UsageMetrics> {
    const usage = this.usage.get(subscriptionId);
    if (!usage) {
      throw new NotFoundError('Usage metrics not found');
    }
    return usage;
  }

  reset() {
    this.plans.clear();
    this.subscriptions.clear();
    this.usage.clear();
  }
}

// Property-based test generators
const subscriptionTierArb = fc.constantFrom(
  SubscriptionTier.FREE,
  SubscriptionTier.BASIC,
  SubscriptionTier.PREMIUM,
  SubscriptionTier.ENTERPRISE
);

const usageTypeArb = fc.constantFrom(
  UsageType.INTERVIEW_STARTED,
  UsageType.INTERVIEW_COMPLETED,
  UsageType.ANALYSIS_GENERATED,
  UsageType.AI_QUESTION_GENERATED,
  UsageType.RECORDING_MINUTE_USED,
  UsageType.REPORT_EXPORTED
);

const planLimitsArb = fc.record({
  interviewsPerMonth: fc.integer({ min: 1, max: 1000 }),
  analysisReportsPerMonth: fc.integer({ min: 1, max: 1000 }),
  aiQuestionsPerInterview: fc.integer({ min: 1, max: 100 }),
  recordingMinutesPerMonth: fc.integer({ min: 10, max: 10000 }),
  exportsPerMonth: fc.integer({ min: 1, max: 100 }),
  maxInterviewDuration: fc.integer({ min: 15, max: 240 }),
  advancedAnalytics: fc.boolean(),
  prioritySupport: fc.boolean(),
  customBranding: fc.boolean(),
});

const planArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  tier: subscriptionTierArb,
  price: fc.integer({ min: 0, max: 100000 }),
  limits: planLimitsArb,
}).map(plan => ({
  ...plan,
  name: `${plan.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Ensure unique names
}));

const userIdArb = fc.string({ minLength: 1, maxLength: 50 }).map(id => `user-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

describe('Subscription Enforcement Property Tests', () => {
  let subscriptionService: DefaultSubscriptionService;
  let mockRepository: MockSubscriptionRepository;

  beforeEach(() => {
    mockRepository = new MockSubscriptionRepository();
    subscriptionService = new DefaultSubscriptionService(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  /**
   * Feature: ai-mock-interview-platform, Property 3: Subscription Tier Enforcement
   * 
   * Property: For any user action, the system should only allow access to features 
   * permitted by the user's current subscription tier.
   * 
   * Validates: Requirements 2.1, 2.3
   */
  test('Property 3: Subscription tier enforcement - usage limits are consistently enforced', async () => {
    await fc.assert(
      fc.asyncProperty(
        planArb,
        userIdArb,
        usageTypeArb,
        fc.integer({ min: 1, max: 50 }),
        async (planData, userId, usageType, requestedQuantity) => {
          // Create a plan with the generated data
          const plan = await subscriptionService.createPlan({
            ...planData,
            currency: 'usd',
            billingInterval: BillingInterval.MONTHLY,
          });

          // Create a subscription for the user
          const subscription = await subscriptionService.createSubscription({
            userId,
            planId: plan.id,
          });

          // Get the limit for this usage type
          let limit: number;
          switch (usageType) {
            case UsageType.INTERVIEW_STARTED:
            case UsageType.INTERVIEW_COMPLETED:
              limit = plan.limits.interviewsPerMonth;
              break;
            case UsageType.ANALYSIS_GENERATED:
              limit = plan.limits.analysisReportsPerMonth;
              break;
            case UsageType.AI_QUESTION_GENERATED:
              limit = plan.limits.aiQuestionsPerInterview;
              break;
            case UsageType.RECORDING_MINUTE_USED:
              limit = plan.limits.recordingMinutesPerMonth;
              break;
            case UsageType.REPORT_EXPORTED:
              limit = plan.limits.exportsPerMonth;
              break;
            default:
              return true; // Skip unknown usage types
          }

          // Check usage limit before any usage
          const initialCheck = await subscriptionService.checkUsageLimit(
            subscription.subscription.id,
            usageType,
            requestedQuantity
          );

          // If requested quantity is within limit, it should be allowed
          if (requestedQuantity <= limit) {
            expect(initialCheck.allowed).toBe(true);
            expect(initialCheck.currentUsage).toBe(0);
            expect(initialCheck.limit).toBe(limit);

            // Track the usage
            await subscriptionService.trackUsage({
              subscriptionId: subscription.subscription.id,
              usageType,
              quantity: requestedQuantity,
            });

            // Verify usage was tracked
            const usage = await subscriptionService.getCurrentUsage(subscription.subscription.id);
            let actualUsage: number;
            switch (usageType) {
              case UsageType.INTERVIEW_STARTED:
              case UsageType.INTERVIEW_COMPLETED:
                actualUsage = usage.interviewsUsed;
                break;
              case UsageType.ANALYSIS_GENERATED:
                actualUsage = usage.analysisReportsGenerated;
                break;
              case UsageType.AI_QUESTION_GENERATED:
                actualUsage = usage.aiQuestionsUsed;
                break;
              case UsageType.RECORDING_MINUTE_USED:
                actualUsage = usage.recordingMinutesUsed;
                break;
              case UsageType.REPORT_EXPORTED:
                actualUsage = usage.exportCount;
                break;
              default:
                actualUsage = 0;
            }

            expect(actualUsage).toBe(requestedQuantity);

            // Check if we can still use more within the limit
            const remainingLimit = limit - requestedQuantity;
            if (remainingLimit > 0) {
              const secondCheck = await subscriptionService.checkUsageLimit(
                subscription.subscription.id,
                usageType,
                remainingLimit
              );
              expect(secondCheck.allowed).toBe(true);
            }

            // Try to exceed the limit
            if (remainingLimit < 10) { // Only test if we're close to the limit
              const exceedCheck = await subscriptionService.checkUsageLimit(
                subscription.subscription.id,
                usageType,
                remainingLimit + 1
              );
              expect(exceedCheck.allowed).toBe(false);
              expect(exceedCheck.upgradeRequired).toBe(true);
            }
          } else {
            // If requested quantity exceeds limit, it should be denied
            expect(initialCheck.allowed).toBe(false);
            expect(initialCheck.upgradeRequired).toBe(true);
            expect(initialCheck.limit).toBe(limit);

            // Attempting to track this usage should throw an error
            await expect(subscriptionService.trackUsage({
              subscriptionId: subscription.subscription.id,
              usageType,
              quantity: requestedQuantity,
            })).rejects.toThrow(UsageLimitExceededError);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ai-mock-interview-platform, Property 3: Subscription Tier Enforcement
   * 
   * Property: For any subscription tier, feature access should be consistent with 
   * the tier's defined capabilities.
   * 
   * Validates: Requirements 2.1, 2.3
   */
  test('Property 3: Subscription tier enforcement - feature access matches tier capabilities', async () => {
    await fc.assert(
      fc.asyncProperty(
        subscriptionTierArb,
        userIdArb,
        async (tier, userId) => {
          // Initialize default plans to ensure consistent tier definitions
          await subscriptionService.initializeDefaultPlans();

          // Get the plan for this tier
          const plans = await subscriptionService.listPlans();
          const plan = plans.find(p => p.tier === tier);
          
          if (!plan) {
            return true; // Skip if plan doesn't exist
          }

          // Create subscription for the user
          const subscription = await subscriptionService.createSubscription({
            userId,
            planId: plan.id,
          });

          // Get all features available to this user
          const userFeatures = await subscriptionService.getFeatureAccess(userId);

          // Verify that all returned features are enabled
          expect(userFeatures.every(f => f.isEnabled)).toBe(true);

          // Check specific feature access based on tier
          const hasAdvancedAnalytics = await subscriptionService.hasFeatureAccess(userId, 'advanced_analysis');
          const hasPrioritySupport = await subscriptionService.hasFeatureAccess(userId, 'priority_support');
          const hasCustomBranding = await subscriptionService.hasFeatureAccess(userId, 'custom_branding');

          // Verify feature access matches tier expectations
          switch (tier) {
            case SubscriptionTier.FREE:
              expect(hasAdvancedAnalytics).toBe(false);
              expect(hasPrioritySupport).toBe(false);
              expect(hasCustomBranding).toBe(false);
              break;
            case SubscriptionTier.BASIC:
              expect(hasPrioritySupport).toBe(false);
              expect(hasCustomBranding).toBe(false);
              break;
            case SubscriptionTier.PREMIUM:
            case SubscriptionTier.ENTERPRISE:
              expect(hasAdvancedAnalytics).toBe(true);
              expect(hasPrioritySupport).toBe(true);
              expect(hasCustomBranding).toBe(true);
              break;
          }

          // Verify that feature access is consistent across multiple calls
          const secondCheck = await subscriptionService.hasFeatureAccess(userId, 'advanced_analysis');
          expect(secondCheck).toBe(hasAdvancedAnalytics);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ai-mock-interview-platform, Property 3: Subscription Tier Enforcement
   * 
   * Property: For any user with an inactive subscription, feature access should be denied.
   * 
   * Validates: Requirements 2.1, 2.3
   */
  test('Property 3: Subscription tier enforcement - inactive subscriptions deny feature access', async () => {
    await fc.assert(
      fc.asyncProperty(
        planArb,
        userIdArb,
        fc.constantFrom(
          SubscriptionStatus.CANCELED,
          SubscriptionStatus.PAST_DUE,
          SubscriptionStatus.UNPAID,
          SubscriptionStatus.INCOMPLETE_EXPIRED,
          SubscriptionStatus.PAUSED
        ),
        async (planData, userId, inactiveStatus) => {
          // Create a plan
          const plan = await subscriptionService.createPlan({
            ...planData,
            currency: 'usd',
            billingInterval: BillingInterval.MONTHLY,
          });

          // Create subscription
          const subscription = await subscriptionService.createSubscription({
            userId,
            planId: plan.id,
          });

          // Update subscription to inactive status
          await mockRepository.updateSubscription(subscription.subscription.id, {
            status: inactiveStatus,
          });

          // Check that feature access is denied for inactive subscription
          const hasBasicFeature = await subscriptionService.hasFeatureAccess(userId, 'basic_interviews');
          const hasAdvancedFeature = await subscriptionService.hasFeatureAccess(userId, 'advanced_analysis');
          const features = await subscriptionService.getFeatureAccess(userId);

          expect(hasBasicFeature).toBe(false);
          expect(hasAdvancedFeature).toBe(false);
          expect(features).toHaveLength(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});