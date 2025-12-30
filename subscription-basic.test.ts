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

// Mock repository for testing
export class MockSubscriptionRepository implements SubscriptionRepository {
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

describe('Subscription Service', () => {
  let subscriptionService: DefaultSubscriptionService;
  let mockRepository: MockSubscriptionRepository;

  beforeEach(() => {
    mockRepository = new MockSubscriptionRepository();
    subscriptionService = new DefaultSubscriptionService(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('Plan Management', () => {
    test('should create a new plan', async () => {
      const planData: CreatePlanRequest = {
        name: 'Test Plan',
        description: 'A test subscription plan',
        tier: SubscriptionTier.BASIC,
        price: 1999,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        features: ['basic_interviews', 'basic_analysis'],
        limits: {
          interviewsPerMonth: 10,
          analysisReportsPerMonth: 10,
          aiQuestionsPerInterview: 10,
          recordingMinutesPerMonth: 100,
          exportsPerMonth: 5,
          maxInterviewDuration: 60,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
        },
      };

      const plan = await subscriptionService.createPlan(planData);

      expect(plan.name).toBe(planData.name);
      expect(plan.tier).toBe(planData.tier);
      expect(plan.price).toBe(planData.price);
      expect(plan.limits).toEqual(planData.limits);
      expect(plan.id).toBeDefined();
    });

    test('should not create plan with duplicate name', async () => {
      const planData: CreatePlanRequest = {
        name: 'Duplicate Plan',
        tier: SubscriptionTier.BASIC,
        price: 1999,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        limits: {
          interviewsPerMonth: 10,
          analysisReportsPerMonth: 10,
          aiQuestionsPerInterview: 10,
          recordingMinutesPerMonth: 100,
          exportsPerMonth: 5,
          maxInterviewDuration: 60,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
        },
      };

      await subscriptionService.createPlan(planData);

      await expect(subscriptionService.createPlan(planData))
        .rejects.toThrow(ConflictError);
    });

    test('should get plan by ID', async () => {
      const planData: CreatePlanRequest = {
        name: 'Test Plan',
        tier: SubscriptionTier.BASIC,
        price: 1999,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        limits: {
          interviewsPerMonth: 10,
          analysisReportsPerMonth: 10,
          aiQuestionsPerInterview: 10,
          recordingMinutesPerMonth: 100,
          exportsPerMonth: 5,
          maxInterviewDuration: 60,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
        },
      };

      const createdPlan = await subscriptionService.createPlan(planData);
      const retrievedPlan = await subscriptionService.getPlan(createdPlan.id);

      expect(retrievedPlan.id).toBe(createdPlan.id);
      expect(retrievedPlan.name).toBe(createdPlan.name);
    });

    test('should throw error when getting non-existent plan', async () => {
      await expect(subscriptionService.getPlan('non-existent-id'))
        .rejects.toThrow(PlanNotFoundError);
    });

    test('should list plans', async () => {
      const plan1Data: CreatePlanRequest = {
        name: 'Plan 1',
        tier: SubscriptionTier.FREE,
        price: 0,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        limits: {
          interviewsPerMonth: 3,
          analysisReportsPerMonth: 3,
          aiQuestionsPerInterview: 5,
          recordingMinutesPerMonth: 60,
          exportsPerMonth: 1,
          maxInterviewDuration: 30,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
        },
      };

      const plan2Data: CreatePlanRequest = {
        name: 'Plan 2',
        tier: SubscriptionTier.BASIC,
        price: 1999,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        limits: {
          interviewsPerMonth: 15,
          analysisReportsPerMonth: 15,
          aiQuestionsPerInterview: 15,
          recordingMinutesPerMonth: 300,
          exportsPerMonth: 10,
          maxInterviewDuration: 60,
          advancedAnalytics: true,
          prioritySupport: false,
          customBranding: false,
        },
      };

      await subscriptionService.createPlan(plan1Data);
      await subscriptionService.createPlan(plan2Data);

      const plans = await subscriptionService.listPlans();

      expect(plans).toHaveLength(2);
      expect(plans.map(p => p.name)).toContain('Plan 1');
      expect(plans.map(p => p.name)).toContain('Plan 2');
    });
  });

  describe('Subscription Management', () => {
    let testPlan: SubscriptionPlan;
    const testUserId = 'test-user-123';

    beforeEach(async () => {
      testPlan = await subscriptionService.createPlan({
        name: 'Test Plan',
        tier: SubscriptionTier.BASIC,
        price: 1999,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        limits: {
          interviewsPerMonth: 15,
          analysisReportsPerMonth: 15,
          aiQuestionsPerInterview: 15,
          recordingMinutesPerMonth: 300,
          exportsPerMonth: 10,
          maxInterviewDuration: 60,
          advancedAnalytics: true,
          prioritySupport: false,
          customBranding: false,
        },
      });
    });

    test('should create subscription', async () => {
      const subscriptionData: CreateSubscriptionRequest = {
        userId: testUserId,
        planId: testPlan.id,
      };

      const response = await subscriptionService.createSubscription(subscriptionData);

      expect(response.subscription.userId).toBe(testUserId);
      expect(response.subscription.planId).toBe(testPlan.id);
      expect(response.plan.id).toBe(testPlan.id);
      expect(response.usage).toBeDefined();
      expect(response.remainingUsage.interviews).toBe(15);
    });

    test('should not create duplicate subscription for user', async () => {
      const subscriptionData: CreateSubscriptionRequest = {
        userId: testUserId,
        planId: testPlan.id,
      };

      await subscriptionService.createSubscription(subscriptionData);

      await expect(subscriptionService.createSubscription(subscriptionData))
        .rejects.toThrow(ConflictError);
    });

    test('should get user subscription', async () => {
      const subscriptionData: CreateSubscriptionRequest = {
        userId: testUserId,
        planId: testPlan.id,
      };

      await subscriptionService.createSubscription(subscriptionData);
      const userSubscription = await subscriptionService.getUserSubscription(testUserId);

      expect(userSubscription).toBeDefined();
      expect(userSubscription!.subscription.userId).toBe(testUserId);
    });

    test('should cancel subscription', async () => {
      const subscriptionData: CreateSubscriptionRequest = {
        userId: testUserId,
        planId: testPlan.id,
      };

      const response = await subscriptionService.createSubscription(subscriptionData);
      const canceledSubscription = await subscriptionService.cancelSubscription(response.subscription.id);

      expect(canceledSubscription.cancelAtPeriodEnd).toBe(true);
      expect(canceledSubscription.canceledAt).toBeDefined();
    });
  });

  describe('Usage Management', () => {
    let testPlan: SubscriptionPlan;
    let testSubscription: any;
    const testUserId = 'test-user-123';

    beforeEach(async () => {
      testPlan = await subscriptionService.createPlan({
        name: 'Test Plan',
        tier: SubscriptionTier.BASIC,
        price: 1999,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        limits: {
          interviewsPerMonth: 5,
          analysisReportsPerMonth: 5,
          aiQuestionsPerInterview: 10,
          recordingMinutesPerMonth: 100,
          exportsPerMonth: 3,
          maxInterviewDuration: 60,
          advancedAnalytics: true,
          prioritySupport: false,
          customBranding: false,
        },
      });

      testSubscription = await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlan.id,
      });
    });

    test('should track usage within limits', async () => {
      const usageRequest = {
        subscriptionId: testSubscription.subscription.id,
        usageType: UsageType.INTERVIEW_STARTED,
        quantity: 2,
      };

      await subscriptionService.trackUsage(usageRequest);

      const usage = await subscriptionService.getCurrentUsage(testSubscription.subscription.id);
      expect(usage.interviewsUsed).toBe(2);
    });

    test('should check usage limits', async () => {
      const usageCheck = await subscriptionService.checkUsageLimit(
        testSubscription.subscription.id,
        UsageType.INTERVIEW_STARTED,
        3
      );

      expect(usageCheck.allowed).toBe(true);
      expect(usageCheck.currentUsage).toBe(0);
      expect(usageCheck.limit).toBe(5);
    });

    test('should reject usage when limit exceeded', async () => {
      // First, use up the limit
      await subscriptionService.trackUsage({
        subscriptionId: testSubscription.subscription.id,
        usageType: UsageType.INTERVIEW_STARTED,
        quantity: 5,
      });

      // Try to exceed the limit
      await expect(subscriptionService.trackUsage({
        subscriptionId: testSubscription.subscription.id,
        usageType: UsageType.INTERVIEW_STARTED,
        quantity: 1,
      })).rejects.toThrow(UsageLimitExceededError);
    });

    test('should reset usage for new period', async () => {
      // Use some quota
      await subscriptionService.trackUsage({
        subscriptionId: testSubscription.subscription.id,
        usageType: UsageType.INTERVIEW_STARTED,
        quantity: 3,
      });

      // Reset usage
      const resetUsage = await subscriptionService.resetUsageForPeriod(testSubscription.subscription.id);

      expect(resetUsage.interviewsUsed).toBe(0);
      expect(resetUsage.analysisReportsGenerated).toBe(0);
    });
  });

  describe('Feature Access', () => {
    let testPlan: SubscriptionPlan;
    let testSubscription: any;
    const testUserId = 'test-user-123';

    beforeEach(async () => {
      testPlan = await subscriptionService.createPlan({
        name: 'Test Plan',
        tier: SubscriptionTier.PREMIUM,
        price: 4999,
        currency: 'usd',
        billingInterval: BillingInterval.MONTHLY,
        features: ['advanced_analysis', 'priority_support'],
        limits: {
          interviewsPerMonth: 100,
          analysisReportsPerMonth: 100,
          aiQuestionsPerInterview: 50,
          recordingMinutesPerMonth: 1000,
          exportsPerMonth: 50,
          maxInterviewDuration: 120,
          advancedAnalytics: true,
          prioritySupport: true,
          customBranding: true,
        },
      });

      testSubscription = await subscriptionService.createSubscription({
        userId: testUserId,
        planId: testPlan.id,
      });
    });

    test('should check feature access', async () => {
      const hasAdvancedAnalysis = await subscriptionService.hasFeatureAccess(testUserId, 'advanced_analysis');
      const hasPrioritySupport = await subscriptionService.hasFeatureAccess(testUserId, 'priority_support');
      const hasNonExistentFeature = await subscriptionService.hasFeatureAccess(testUserId, 'non_existent_feature');

      expect(hasAdvancedAnalysis).toBe(true);
      expect(hasPrioritySupport).toBe(true);
      expect(hasNonExistentFeature).toBe(false);
    });

    test('should get all feature access', async () => {
      const features = await subscriptionService.getFeatureAccess(testUserId);

      expect(features.length).toBeGreaterThan(0);
      expect(features.every(f => f.isEnabled)).toBe(true);
    });
  });

  describe('System Operations', () => {
    test('should initialize default plans', async () => {
      await subscriptionService.initializeDefaultPlans();

      const plans = await subscriptionService.listPlans();
      expect(plans.length).toBeGreaterThanOrEqual(3);

      const freePlan = plans.find(p => p.tier === SubscriptionTier.FREE);
      const basicPlan = plans.find(p => p.tier === SubscriptionTier.BASIC);
      const premiumPlan = plans.find(p => p.tier === SubscriptionTier.PREMIUM);

      expect(freePlan).toBeDefined();
      expect(basicPlan).toBeDefined();
      expect(premiumPlan).toBeDefined();

      expect(freePlan!.price).toBe(0);
      expect(basicPlan!.price).toBe(1999);
      expect(premiumPlan!.price).toBe(4999);
    });
  });
});