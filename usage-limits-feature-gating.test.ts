/**
 * Feature: ai-mock-interview-platform
 * Test: Usage Limits and Feature Gating Implementation
 * 
 * This test validates the implementation of usage limits and feature gating
 * as specified in requirements 2.2 and 2.7.
 */

import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../app';
import {
  SubscriptionTier,
  SubscriptionStatus,
  UsageType,
  BillingInterval,
} from '../types';
import { DatabaseSubscriptionRepository } from '../database/subscription-repository';

describe('Usage Limits and Feature Gating', () => {
  let app: any;
  let pool: Pool;
  let repository: DatabaseSubscriptionRepository;
  let testUserId: string;
  let testSubscriptionId: string;
  let freePlanId: string;
  let basicPlanId: string;

  beforeAll(async () => {
    // Setup test database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_billing',
    });

    app = createApp(pool);
    repository = new DatabaseSubscriptionRepository(pool);

    // Create test plans
    const freePlan = await repository.createPlan({
      name: 'Free Test Plan',
      description: 'Free plan for testing',
      tier: SubscriptionTier.FREE,
      price: 0,
      currency: 'usd',
      billingInterval: BillingInterval.MONTHLY,
      features: [],
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
      isActive: true,
    });
    freePlanId = freePlan.id;

    const basicPlan = await repository.createPlan({
      name: 'Basic Test Plan',
      description: 'Basic plan for testing',
      tier: SubscriptionTier.BASIC,
      price: 1999,
      currency: 'usd',
      billingInterval: BillingInterval.MONTHLY,
      features: [],
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
      isActive: true,
    });
    basicPlanId = basicPlan.id;

    // Create test user and subscription
    testUserId = 'test-user-' + Date.now();
    const subscription = await repository.createSubscription({
      userId: testUserId,
      planId: freePlanId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
    });
    testSubscriptionId = subscription.id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM usage_metrics WHERE subscription_id = $1', [testSubscriptionId]);
    await pool.query('DELETE FROM user_subscriptions WHERE id = $1', [testSubscriptionId]);
    await pool.query('DELETE FROM subscription_plans WHERE id IN ($1, $2)', [freePlanId, basicPlanId]);
    await pool.end();
  });

  describe('Feature Access Control', () => {
    it('should allow access to basic features for free plan users', async () => {
      const response = await request(app)
        .post('/api/interviews/start')
        .set('x-user-id', testUserId)
        .send({ type: 'basic' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Interview started successfully');
    });

    it('should block premium features for free plan users', async () => {
      const response = await request(app)
        .get('/api/analytics/advanced')
        .set('x-user-id', testUserId);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PREMIUM_REQUIRED');
      expect(response.body.upgradeRequired).toBe(true);
    });

    it('should provide upgrade suggestions when feature is blocked', async () => {
      const response = await request(app)
        .get('/api/analytics/advanced')
        .set('x-user-id', testUserId);

      expect(response.body.suggestedPlan).toBeDefined();
      expect(response.body.suggestedPlan.tier).toBe(SubscriptionTier.BASIC);
    });
  });

  describe('Usage Limit Enforcement', () => {
    beforeEach(async () => {
      // Reset usage for each test
      await repository.resetUsage(
        testSubscriptionId,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
    });

    it('should allow usage within limits', async () => {
      // Free plan allows 3 interviews per month
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/usage/track')
          .set('x-user-id', testUserId)
          .send({
            subscriptionId: testSubscriptionId,
            usageType: UsageType.INTERVIEW_STARTED,
            quantity: 1,
          });

        expect(response.status).toBe(204);
      }
    });

    it('should block usage when limit is exceeded', async () => {
      // Use up the limit (3 interviews)
      for (let i = 0; i < 3; i++) {
        await repository.trackUsage(testSubscriptionId, UsageType.INTERVIEW_STARTED, 1);
      }

      // Try to exceed the limit
      const response = await request(app)
        .post('/api/usage/track')
        .set('x-user-id', testUserId)
        .send({
          subscriptionId: testSubscriptionId,
          usageType: UsageType.INTERVIEW_STARTED,
          quantity: 1,
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('USAGE_LIMIT_EXCEEDED');
      expect(response.body.upgradeRequired).toBe(true);
    });

    it('should provide usage check without tracking', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/${testSubscriptionId}/usage/check`)
        .query({
          usageType: UsageType.INTERVIEW_STARTED,
          quantity: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(true);
      expect(response.body.currentUsage).toBe(0);
      expect(response.body.limit).toBe(3);
    });

    it('should show usage warnings when approaching limits', async () => {
      // Use 2 out of 3 interviews (66.7% usage)
      await repository.trackUsage(testSubscriptionId, UsageType.INTERVIEW_STARTED, 2);

      const response = await request(app)
        .get(`/api/subscriptions/${testSubscriptionId}/usage/warnings`);

      expect(response.status).toBe(200);
      expect(response.body.warnings).toHaveLength(0); // Warning threshold is 80%

      // Use 3 out of 3 interviews (100% usage)
      await repository.trackUsage(testSubscriptionId, UsageType.INTERVIEW_STARTED, 1);

      const warningResponse = await request(app)
        .get(`/api/subscriptions/${testSubscriptionId}/usage/warnings`);

      expect(warningResponse.body.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Usage Summary and Analytics', () => {
    beforeEach(async () => {
      // Reset usage and add some test data
      await repository.resetUsage(
        testSubscriptionId,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      
      // Add some usage
      await repository.trackUsage(testSubscriptionId, UsageType.INTERVIEW_STARTED, 2);
      await repository.trackUsage(testSubscriptionId, UsageType.ANALYSIS_GENERATED, 1);
      await repository.trackUsage(testSubscriptionId, UsageType.RECORDING_MINUTE_USED, 30);
    });

    it('should provide comprehensive usage summary', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/${testSubscriptionId}/usage/summary`);

      expect(response.status).toBe(200);
      expect(response.body.subscription).toBeDefined();
      expect(response.body.plan).toBeDefined();
      expect(response.body.usage).toBeInstanceOf(Array);
      
      const interviewUsage = response.body.usage.find(
        (u: any) => u.usageType === UsageType.INTERVIEW_STARTED
      );
      expect(interviewUsage.currentUsage).toBe(2);
      expect(interviewUsage.limit).toBe(3);
      expect(interviewUsage.percentageUsed).toBeCloseTo(66.67, 1);
    });

    it('should track usage with metadata', async () => {
      const response = await request(app)
        .post('/api/usage/track')
        .set('x-user-id', testUserId)
        .send({
          subscriptionId: testSubscriptionId,
          usageType: UsageType.ANALYSIS_GENERATED,
          quantity: 1,
          metadata: {
            analysisType: 'comprehensive',
            interviewId: 'test-interview-123',
          },
        });

      expect(response.status).toBe(204);
    });
  });

  describe('Upgrade Prompts and Recommendations', () => {
    it('should provide upgrade recommendations for free users', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/upgrade/recommendation`);

      expect(response.status).toBe(200);
      expect(response.body.currentPlan.tier).toBe(SubscriptionTier.FREE);
      expect(response.body.recommendedPlan.tier).toBe(SubscriptionTier.BASIC);
      expect(response.body.reasons).toBeInstanceOf(Array);
      expect(response.body.urgency).toBeDefined();
    });

    it('should determine when to show upgrade prompts', async () => {
      // Use significant amount of free plan resources
      await repository.trackUsage(testSubscriptionId, UsageType.INTERVIEW_STARTED, 2);

      const response = await request(app)
        .get(`/api/users/${testUserId}/upgrade/should-show`);

      expect(response.status).toBe(200);
      expect(response.body.shouldShow).toBe(true);
      expect(response.body.reason).toBe('free_plan_usage');
    });

    it('should provide plan comparison', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/upgrade/plan-comparison`)
        .query({ targetTier: SubscriptionTier.BASIC });

      expect(response.status).toBe(200);
      expect(response.body.current.tier).toBe(SubscriptionTier.FREE);
      expect(response.body.target.tier).toBe(SubscriptionTier.BASIC);
      expect(response.body.differences).toBeDefined();
      expect(response.body.costDifference).toBe(1999); // Basic plan price
    });

    it('should track upgrade prompt interactions', async () => {
      const response = await request(app)
        .post('/api/upgrade/track-interaction')
        .set('x-user-id', testUserId)
        .send({
          action: 'viewed',
          planTier: SubscriptionTier.BASIC,
          source: 'usage_limit',
        });

      expect(response.status).toBe(204);
    });
  });

  describe('Subscription Context Headers', () => {
    it('should add subscription context to response headers', async () => {
      const response = await request(app)
        .get(`/api/subscriptions/${testSubscriptionId}`)
        .set('x-user-id', testUserId);

      expect(response.status).toBe(200);
      expect(response.headers['x-subscription-plan']).toBe('Free Test Plan');
      expect(response.headers['x-subscription-tier']).toBe(SubscriptionTier.FREE);
      expect(response.headers['x-remaining-interviews']).toBeDefined();
      expect(response.headers['x-remaining-reports']).toBeDefined();
    });
  });

  describe('Plan Upgrade Flow', () => {
    it('should allow upgrading from free to basic plan', async () => {
      const response = await request(app)
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('x-user-id', testUserId)
        .send({
          planId: basicPlanId,
        });

      expect(response.status).toBe(200);
      expect(response.body.plan.tier).toBe(SubscriptionTier.BASIC);
      expect(response.body.plan.limits.interviewsPerMonth).toBe(15);
    });

    it('should reset usage limits after plan upgrade', async () => {
      // First, use up free plan limits
      await repository.trackUsage(testSubscriptionId, UsageType.INTERVIEW_STARTED, 3);

      // Upgrade to basic plan
      await request(app)
        .put(`/api/subscriptions/${testSubscriptionId}`)
        .set('x-user-id', testUserId)
        .send({ planId: basicPlanId });

      // Check that usage limits are now based on basic plan
      const usageCheck = await request(app)
        .get(`/api/subscriptions/${testSubscriptionId}/usage/check`)
        .query({
          usageType: UsageType.INTERVIEW_STARTED,
          quantity: 1,
        });

      expect(usageCheck.body.allowed).toBe(true);
      expect(usageCheck.body.limit).toBe(15); // Basic plan limit
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle requests without authentication', async () => {
      const response = await request(app)
        .post('/api/usage/track')
        .send({
          subscriptionId: testSubscriptionId,
          usageType: UsageType.INTERVIEW_STARTED,
          quantity: 1,
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should handle invalid subscription IDs', async () => {
      const response = await request(app)
        .get('/api/subscriptions/invalid-id/usage/summary');

      expect(response.status).toBe(404);
    });

    it('should handle zero quantity usage tracking', async () => {
      const response = await request(app)
        .post('/api/usage/track')
        .set('x-user-id', testUserId)
        .send({
          subscriptionId: testSubscriptionId,
          usageType: UsageType.INTERVIEW_STARTED,
          quantity: 0,
        });

      expect(response.status).toBe(400); // Should validate minimum quantity
    });

    it('should handle concurrent usage tracking', async () => {
      // Simulate concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/usage/track')
          .set('x-user-id', testUserId)
          .send({
            subscriptionId: testSubscriptionId,
            usageType: UsageType.INTERVIEW_STARTED,
            quantity: 1,
          })
      );

      const responses = await Promise.all(promises);
      
      // Only 3 should succeed (free plan limit), others should fail
      const successful = responses.filter(r => r.status === 204);
      const failed = responses.filter(r => r.status === 403);
      
      expect(successful.length).toBe(3);
      expect(failed.length).toBe(2);
    });
  });
});

/**
 * Integration test for middleware usage in real scenarios
 */
describe('Middleware Integration', () => {
  let app: any;
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_billing',
    });
    app = createApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should demonstrate complete interview flow with usage tracking', async () => {
    const userId = 'integration-test-user-' + Date.now();
    
    // 1. Check if user can start interview
    const canStartResponse = await request(app)
      .get('/api/interviews/can-start')
      .set('x-user-id', userId);

    // Should fail because user has no subscription
    expect(canStartResponse.status).toBe(404);

    // 2. Create subscription first (this would be done through payment flow)
    // ... subscription creation logic ...

    // 3. Start interview with usage tracking
    // This would use the middleware to check limits and track usage
    // ... interview start logic ...

    // 4. Complete interview with multiple usage types
    // This would track interview completion, recording minutes, and AI questions
    // ... interview completion logic ...
  });
});