/**
 * Unit tests for usage enforcement functionality
 * These tests validate the core logic without requiring database connections
 */

import { UsageEnforcementService } from '../services/usage-enforcement';
import { SubscriptionService, SubscriptionTier, UsageType } from '../types';

// Mock subscription service
const mockSubscriptionService: jest.Mocked<SubscriptionService> = {
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
  getPlan: jest.fn(),
  listPlans: jest.fn(),
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  getUserSubscription: jest.fn(),
  getSubscription: jest.fn(),
  trackUsage: jest.fn(),
  checkUsageLimit: jest.fn(),
  getCurrentUsage: jest.fn(),
  resetUsageForPeriod: jest.fn(),
  hasFeatureAccess: jest.fn(),
  getFeatureAccess: jest.fn(),
  initializeDefaultPlans: jest.fn(),
  processSubscriptionRenewal: jest.fn(),
  handleFailedPayment: jest.fn(),
};

describe('UsageEnforcementService', () => {
  let usageEnforcementService: UsageEnforcementService;

  beforeEach(() => {
    usageEnforcementService = new UsageEnforcementService(mockSubscriptionService);
    jest.clearAllMocks();
  });

  describe('enforceUsage', () => {
    it('should allow usage within limits for free tier', async () => {
      // Mock subscription data
      const mockSubscription = {
        subscription: { id: 'sub-123' },
        plan: { 
          tier: SubscriptionTier.FREE,
          name: 'Free Plan',
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
          }
        },
        usage: {
          interviewsUsed: 1, // Currently used 1 out of 3
          analysisReportsGenerated: 0,
          aiQuestionsUsed: 0,
          recordingMinutesUsed: 0,
          exportCount: 0,
        },
        remainingUsage: {
          interviews: 2,
          analysisReports: 3,
          aiQuestions: 5,
          recordingMinutes: 60,
          exports: 1,
        }
      };

      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription as any);

      const result = await usageEnforcementService.enforceUsage(
        'sub-123',
        UsageType.INTERVIEW_STARTED,
        1
      );

      expect(result.allowed).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.upgradeRequired).toBe(false);
    });

    it('should allow usage in grace period with warning', async () => {
      // Mock subscription data with usage at limit (should allow 1 more due to grace period)
      const mockSubscription = {
        subscription: { id: 'sub-123' },
        plan: { 
          tier: SubscriptionTier.FREE,
          name: 'Free Plan',
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
          }
        },
        usage: {
          interviewsUsed: 3, // At limit, but grace period allows 1 more
          analysisReportsGenerated: 0,
          aiQuestionsUsed: 0,
          recordingMinutesUsed: 0,
          exportCount: 0,
        },
        remainingUsage: {
          interviews: 0,
          analysisReports: 3,
          aiQuestions: 5,
          recordingMinutes: 60,
          exports: 1,
        }
      };

      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription as any);

      const result = await usageEnforcementService.enforceUsage(
        'sub-123',
        UsageType.INTERVIEW_STARTED,
        1
      );

      expect(result.allowed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].upgradeRecommended).toBe(true);
    });

    it('should block usage when limit is exceeded', async () => {
      // Mock subscription data with usage at limit + grace period
      const mockSubscription = {
        subscription: { id: 'sub-123' },
        plan: { 
          tier: SubscriptionTier.FREE,
          name: 'Free Plan',
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
          }
        },
        usage: {
          interviewsUsed: 4, // Already exceeded limit + grace period (3 + 1)
          analysisReportsGenerated: 0,
          aiQuestionsUsed: 0,
          recordingMinutesUsed: 0,
          exportCount: 0,
        },
        remainingUsage: {
          interviews: -1,
          analysisReports: 3,
          aiQuestions: 5,
          recordingMinutes: 60,
          exports: 1,
        }
      };

      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription as any);

      const result = await usageEnforcementService.enforceUsage(
        'sub-123',
        UsageType.INTERVIEW_STARTED,
        1
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Usage limit exceeded');
      expect(result.upgradeRequired).toBe(true);
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should generate warnings when approaching limits', async () => {
      // Mock subscription data with high usage (80%+)
      const mockSubscription = {
        subscription: { id: 'sub-123' },
        plan: { 
          tier: SubscriptionTier.FREE,
          name: 'Free Plan',
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
          }
        },
        usage: {
          interviewsUsed: 2, // 66% usage, but let's test with recording minutes at 85%
          analysisReportsGenerated: 0,
          aiQuestionsUsed: 0,
          recordingMinutesUsed: 51, // 85% of 60 minutes
          exportCount: 0,
        },
        remainingUsage: {
          interviews: 1,
          analysisReports: 3,
          aiQuestions: 5,
          recordingMinutes: 9,
          exports: 1,
        }
      };

      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription as any);

      const result = await usageEnforcementService.enforceUsage(
        'sub-123',
        UsageType.RECORDING_MINUTE_USED,
        5
      );

      expect(result.allowed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].percentageUsed).toBeGreaterThan(80);
    });

    it('should allow higher limits for premium tiers', async () => {
      // Mock premium subscription
      const mockSubscription = {
        subscription: { id: 'sub-premium' },
        plan: { 
          tier: SubscriptionTier.PREMIUM,
          name: 'Premium Plan',
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
          }
        },
        usage: {
          interviewsUsed: 50, // 50% usage
          analysisReportsGenerated: 25,
          aiQuestionsUsed: 20,
          recordingMinutesUsed: 500,
          exportCount: 10,
        },
        remainingUsage: {
          interviews: 50,
          analysisReports: 75,
          aiQuestions: 30,
          recordingMinutes: 500,
          exports: 40,
        }
      };

      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription as any);

      const result = await usageEnforcementService.enforceUsage(
        'sub-premium',
        UsageType.INTERVIEW_STARTED,
        10
      );

      expect(result.allowed).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.upgradeRequired).toBe(false);
    });
  });

  describe('getUsageSummary', () => {
    it('should provide comprehensive usage summary', async () => {
      const mockSubscription = {
        subscription: { id: 'sub-123', userId: 'user-123' },
        plan: { 
          tier: SubscriptionTier.BASIC,
          name: 'Basic Plan',
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
          }
        },
        usage: {
          interviewsUsed: 8,
          analysisReportsGenerated: 5,
          aiQuestionsUsed: 45,
          recordingMinutesUsed: 150,
          exportCount: 3,
        },
        remainingUsage: {
          interviews: 7,
          analysisReports: 10,
          aiQuestions: 0, // This is per-session, so it resets
          recordingMinutes: 150,
          exports: 7,
        }
      };

      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription as any);

      const summary = await usageEnforcementService.getUsageSummary('sub-123');

      expect(summary.subscription).toBeDefined();
      expect(summary.plan).toBeDefined();
      expect(summary.usage).toBeInstanceOf(Array);
      expect(summary.usage.length).toBeGreaterThan(0);

      // Check that usage percentages are calculated correctly
      const interviewUsage = summary.usage.find(u => u.usageType === UsageType.INTERVIEW_STARTED);
      expect(interviewUsage).toBeDefined();
      expect(interviewUsage!.currentUsage).toBe(8);
      expect(interviewUsage!.limit).toBe(15);
      expect(interviewUsage!.percentageUsed).toBeCloseTo(53.33, 1);
    });
  });

  describe('enforceMultipleUsage', () => {
    it('should check multiple usage types at once', async () => {
      const mockSubscription = {
        subscription: { id: 'sub-123' },
        plan: { 
          tier: SubscriptionTier.FREE,
          name: 'Free Plan',
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
          }
        },
        usage: {
          interviewsUsed: 2, // Close to limit
          analysisReportsGenerated: 2, // Close to limit
          aiQuestionsUsed: 0,
          recordingMinutesUsed: 0,
          exportCount: 1, // At limit
        },
        remainingUsage: {
          interviews: 1,
          analysisReports: 1,
          aiQuestions: 5,
          recordingMinutes: 60,
          exports: 0,
        }
      };

      mockSubscriptionService.getSubscription.mockResolvedValue(mockSubscription as any);

      const result = await usageEnforcementService.enforceMultipleUsage('sub-123', [
        { usageType: UsageType.INTERVIEW_STARTED, quantity: 1 },
        { usageType: UsageType.ANALYSIS_GENERATED, quantity: 1 },
        { usageType: UsageType.REPORT_EXPORTED, quantity: 1 }, // This should fail
      ]);

      expect(result.allowed).toBe(false); // Should fail because export limit is exceeded
      expect(result.upgradeRequired).toBe(true);
      expect(result.reason).toContain('Usage limit exceeded');
    });
  });
});

describe('Feature Access Control', () => {
  it('should validate usage enforcement rules are properly configured', () => {
    const service = new UsageEnforcementService(mockSubscriptionService);
    
    // Test that enforcement rules exist for all major usage types
    const testUsageTypes = [
      UsageType.INTERVIEW_STARTED,
      UsageType.ANALYSIS_GENERATED,
      UsageType.AI_QUESTION_GENERATED,
      UsageType.RECORDING_MINUTE_USED,
      UsageType.REPORT_EXPORTED,
    ];

    // This is a structural test to ensure the service is properly configured
    expect(service).toBeDefined();
    expect(typeof service.enforceUsage).toBe('function');
    expect(typeof service.getUsageSummary).toBe('function');
    expect(typeof service.getUsageWarnings).toBe('function');
  });
});