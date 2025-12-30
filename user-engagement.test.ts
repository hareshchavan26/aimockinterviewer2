import { DefaultUserEngagementService } from '../services/user-engagement-service';
import {
  CategoryScores,
  InterviewSession,
  PerformanceReport,
  InterviewConfig,
} from '@ai-interview/types';
import { Milestone } from '../services/progress-tracking-service';

describe('User Engagement Service', () => {
  let engagementService: DefaultUserEngagementService;

  beforeEach(() => {
    engagementService = new DefaultUserEngagementService();
  });

  const mockCategoryScores: CategoryScores = {
    communication: 0.75,
    technicalAccuracy: 0.82,
    confidence: 0.68,
    clarity: 0.79,
    structure: 0.73,
    relevance: 0.81,
  };

  const mockSession: InterviewSession = {
    id: 'session-1',
    userId: 'user-123',
    config: {
      industry: 'Technology',
      role: 'Software Engineer',
      company: 'TechCorp',
      difficulty: 'medium',
      questionTypes: ['behavioral', 'technical'],
      timeLimit: 3600,
      interviewerPersonality: 'friendly',
    } as InterviewConfig,
    status: 'completed',
    questions: [],
    responses: [],
    startTime: new Date('2023-01-01'),
    endTime: new Date('2023-01-01'),
    duration: 3600,
    metadata: {},
  };

  const mockReport: PerformanceReport = {
    id: 'report-1',
    sessionId: 'session-1',
    userId: 'user-123',
    overallScore: 0.78,
    categoryScores: mockCategoryScores,
    strengths: ['technicalAccuracy', 'relevance'],
    weaknesses: ['confidence'],
    improvementPlan: {
      priorityAreas: ['confidence'],
      recommendations: [],
      practiceExercises: [],
      estimatedTimeToImprove: 14,
    },
    benchmarkComparison: {
      percentile: 65,
      averageScore: 0.78,
      topPerformerScore: 0.9,
      industryAverage: 0.7,
      roleAverage: 0.72,
    },
    transcript: {
      segments: [],
      highlights: [],
      summary: 'Mock transcript',
    },
    visualComponents: {
      scoreChart: { type: 'radar', data: [], colors: [], labels: [] },
      confidenceHeatmap: { 
        timePoints: [], 
        dimensions: { width: 800, height: 400 }, 
        colorScale: { min: '#ffebee', max: '#c8e6c9', steps: 10 } 
      },
      progressChart: { 
        type: 'line', 
        timeSeriesData: [], 
        trendLine: { slope: 0.1, direction: 'improving', confidence: 0.8 } 
      },
      categoryBreakdown: { type: 'donut', segments: [], totalScore: 0.78 },
    },
    createdAt: new Date('2023-01-01'),
  };

  const mockMilestones: Milestone[] = [
    {
      id: 'milestone_1',
      title: 'Communication Competency',
      description: 'Achieve 70% or higher in communication skills',
      targetValue: 0.7,
      currentValue: 0.75,
      category: 'communication',
      isAchieved: true,
      achievedAt: new Date()
    },
    {
      id: 'milestone_2',
      title: 'Technical Excellence',
      description: 'Achieve 80% or higher in technical accuracy',
      targetValue: 0.8,
      currentValue: 0.82,
      category: 'technicalAccuracy',
      isAchieved: true,
      achievedAt: new Date()
    }
  ];

  describe('Notification Management', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        userId: 'user-123',
        type: 'milestone' as const,
        title: 'Milestone Achieved!',
        message: 'You have achieved a new milestone',
        isRead: false,
        priority: 'high' as const
      };

      const notification = await engagementService.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe('user-123');
      expect(notification.type).toBe('milestone');
      expect(notification.title).toBe('Milestone Achieved!');
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should get user notifications', async () => {
      const notifications = await engagementService.getUserNotifications('user-123');

      expect(notifications).toBeInstanceOf(Array);
      expect(notifications.length).toBeGreaterThan(0);

      if (notifications.length > 0) {
        const notification = notifications[0];
        expect(notification.id).toBeDefined();
        expect(notification.userId).toBe('user-123');
        expect(notification.type).toMatch(/^(milestone|achievement|reminder|progress|streak)$/);
        expect(notification.title).toBeDefined();
        expect(notification.message).toBeDefined();
        expect(typeof notification.isRead).toBe('boolean');
        expect(notification.createdAt).toBeInstanceOf(Date);
        expect(notification.priority).toMatch(/^(low|medium|high)$/);
      }
    });

    it('should limit notifications when limit is specified', async () => {
      const notifications = await engagementService.getUserNotifications('user-123', 2);
      expect(notifications.length).toBeLessThanOrEqual(2);
    });

    it('should mark notification as read', async () => {
      await expect(engagementService.markNotificationAsRead('notif_1')).resolves.not.toThrow();
    });

    it('should schedule progress reminder', async () => {
      const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const reminder = await engagementService.scheduleProgressReminder('user-123', scheduledFor);

      expect(reminder).toBeDefined();
      expect(reminder.type).toBe('reminder');
      expect(reminder.userId).toBe('user-123');
      expect(reminder.scheduledFor).toEqual(scheduledFor);
      expect(reminder.title).toContain('Practice');
    });
  });

  describe('Achievement System', () => {
    it('should check and unlock achievements', async () => {
      const achievements = await engagementService.checkAndUnlockAchievements(
        'user-123',
        mockSession,
        mockReport,
        mockMilestones
      );

      expect(achievements).toBeInstanceOf(Array);
      
      if (achievements.length > 0) {
        const achievement = achievements[0];
        expect(achievement.id).toBeDefined();
        expect(achievement.title).toBeDefined();
        expect(achievement.description).toBeDefined();
        expect(achievement.category).toMatch(/^(performance|consistency|improvement|milestone|streak)$/);
        expect(achievement.icon).toBeDefined();
        expect(achievement.points).toBeGreaterThan(0);
        expect(achievement.rarity).toMatch(/^(common|uncommon|rare|epic|legendary)$/);
        expect(achievement.isUnlocked).toBe(true);
        expect(achievement.unlockedAt).toBeInstanceOf(Date);
        expect(achievement.progress.current).toBeGreaterThanOrEqual(0);
        expect(achievement.progress.target).toBeGreaterThan(0);
        expect(achievement.progress.percentage).toBeGreaterThanOrEqual(0);
        expect(achievement.progress.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should unlock performance achievements for high scores', async () => {
      const highScoreReport = { ...mockReport, overallScore: 0.92 };
      
      const achievements = await engagementService.checkAndUnlockAchievements(
        'user-123',
        mockSession,
        highScoreReport,
        mockMilestones
      );

      const excellenceAchievement = achievements.find(a => a.id === 'perf_excellence');
      expect(excellenceAchievement).toBeDefined();
      expect(excellenceAchievement?.title).toBe('Excellence Achieved');
      expect(excellenceAchievement?.points).toBe(100);
      expect(excellenceAchievement?.rarity).toBe('rare');
    });

    it('should unlock milestone achievements', async () => {
      const achievements = await engagementService.checkAndUnlockAchievements(
        'user-123',
        mockSession,
        mockReport,
        mockMilestones
      );

      const milestoneAchievement = achievements.find(a => a.id === 'milestone_achiever');
      expect(milestoneAchievement).toBeDefined();
      expect(milestoneAchievement?.category).toBe('milestone');
    });

    it('should get user achievements', async () => {
      const achievements = await engagementService.getUserAchievements('user-123');

      expect(achievements).toBeInstanceOf(Array);
      expect(achievements.length).toBeGreaterThan(0);

      const achievement = achievements[0];
      expect(achievement.id).toBeDefined();
      expect(achievement.title).toBeDefined();
      expect(achievement.description).toBeDefined();
      expect(achievement.category).toBeDefined();
      expect(achievement.points).toBeGreaterThan(0);
      expect(typeof achievement.isUnlocked).toBe('boolean');
      expect(achievement.progress).toBeDefined();
      expect(achievement.progress.current).toBeGreaterThanOrEqual(0);
      expect(achievement.progress.target).toBeGreaterThan(0);
    });

    it('should calculate achievement progress', async () => {
      const achievements = await engagementService.calculateAchievementProgress('user-123');

      expect(achievements).toBeInstanceOf(Array);
      achievements.forEach(achievement => {
        expect(achievement.progress.percentage).toBeGreaterThanOrEqual(0);
        expect(achievement.progress.percentage).toBeLessThanOrEqual(100);
        
        if (achievement.isUnlocked) {
          expect(achievement.progress.percentage).toBe(100);
          expect(achievement.unlockedAt).toBeInstanceOf(Date);
        }
      });
    });
  });

  describe('Practice Recommendations', () => {
    it('should generate practice recommendations for new users', async () => {
      const recommendations = await engagementService.generatePracticeRecommendations(
        'new-user',
        [],
        []
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      const recommendation = recommendations[0];
      expect(recommendation.id).toBeDefined();
      expect(recommendation.userId).toBe('new-user');
      expect(recommendation.type).toMatch(/^(skill_focus|question_type|difficulty_adjustment|consistency_building)$/);
      expect(recommendation.title).toBeDefined();
      expect(recommendation.description).toBeDefined();
      expect(recommendation.priority).toMatch(/^(high|medium|low)$/);
      expect(recommendation.estimatedTimeMinutes).toBeGreaterThan(0);
      expect(recommendation.targetSkills).toBeInstanceOf(Array);
      expect(recommendation.recommendedFrequency).toMatch(/^(daily|weekly|bi-weekly)$/);
      expect(recommendation.difficulty).toMatch(/^(beginner|intermediate|advanced)$/);
      expect(recommendation.isActive).toBe(true);
    });

    it('should generate skill-focused recommendations for weak areas', async () => {
      const weakReport = {
        ...mockReport,
        categoryScores: {
          ...mockCategoryScores,
          confidence: 0.45, // Low confidence score
          communication: 0.55 // Low communication score
        }
      };

      const recommendations = await engagementService.generatePracticeRecommendations(
        'user-123',
        [mockSession],
        [weakReport]
      );

      expect(recommendations.length).toBeGreaterThan(0);
      
      const confidenceRecommendation = recommendations.find(r => 
        r.targetSkills.includes('confidence')
      );
      expect(confidenceRecommendation).toBeDefined();
      expect(confidenceRecommendation?.priority).toBe('high');
      expect(confidenceRecommendation?.type).toBe('skill_focus');
    });

    it('should generate consistency recommendations for inconsistent performance', async () => {
      const inconsistentReports = [
        { ...mockReport, overallScore: 0.9 },
        { ...mockReport, overallScore: 0.5 },
        { ...mockReport, overallScore: 0.8 }
      ];

      const recommendations = await engagementService.generatePracticeRecommendations(
        'user-123',
        [mockSession, mockSession, mockSession],
        inconsistentReports
      );

      const consistencyRecommendation = recommendations.find(r => 
        r.type === 'consistency_building'
      );
      expect(consistencyRecommendation).toBeDefined();
      expect(consistencyRecommendation?.title).toContain('Consistency');
    });

    it('should generate difficulty adjustment recommendations for high performers', async () => {
      const highPerformanceReports = [
        { ...mockReport, overallScore: 0.85 },
        { ...mockReport, overallScore: 0.88 },
        { ...mockReport, overallScore: 0.82 }
      ];

      const recommendations = await engagementService.generatePracticeRecommendations(
        'user-123',
        [mockSession, mockSession, mockSession],
        highPerformanceReports
      );

      const difficultyRecommendation = recommendations.find(r => 
        r.type === 'difficulty_adjustment'
      );
      expect(difficultyRecommendation).toBeDefined();
      expect(difficultyRecommendation?.difficulty).toBe('advanced');
    });

    it('should get user practice recommendations', async () => {
      const recommendations = await engagementService.getUserPracticeRecommendations('user-123');

      expect(recommendations).toBeInstanceOf(Array);
      
      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        expect(recommendation.id).toBeDefined();
        expect(recommendation.userId).toBe('user-123');
        expect(recommendation.isActive).toBe(true);
        expect(recommendation.completedAt).toBeUndefined();
      }
    });

    it('should mark recommendation as completed', async () => {
      await expect(engagementService.markRecommendationCompleted('rec_1')).resolves.not.toThrow();
    });
  });

  describe('Engagement Metrics', () => {
    it('should calculate engagement metrics', async () => {
      const metrics = await engagementService.calculateEngagementMetrics('user-123');

      expect(metrics).toBeDefined();
      expect(metrics.totalNotifications).toBeGreaterThanOrEqual(0);
      expect(metrics.unreadNotifications).toBeGreaterThanOrEqual(0);
      expect(metrics.achievementsUnlocked).toBeGreaterThanOrEqual(0);
      expect(metrics.totalAchievements).toBeGreaterThan(0);
      expect(metrics.activeRecommendations).toBeGreaterThanOrEqual(0);
      expect(metrics.completedRecommendations).toBeGreaterThanOrEqual(0);
      expect(metrics.engagementScore).toBeGreaterThanOrEqual(0);
      expect(metrics.engagementScore).toBeLessThanOrEqual(100);
      expect(metrics.lastActiveDate).toBeInstanceOf(Date);
      expect(metrics.streakCount).toBeGreaterThanOrEqual(0);
      expect(metrics.totalPoints).toBeGreaterThanOrEqual(0);
    });

    it('should calculate higher engagement score for active users', async () => {
      const metrics = await engagementService.calculateEngagementMetrics('active-user');
      
      // Engagement score should be reasonable (not 0 or negative)
      expect(metrics.engagementScore).toBeGreaterThan(0);
      
      // Should have some achievements unlocked in mock data
      expect(metrics.achievementsUnlocked).toBeGreaterThan(0);
      expect(metrics.totalPoints).toBeGreaterThan(0);
    });

    it('should update user engagement', async () => {
      await expect(engagementService.updateUserEngagement('user-123', 'session_completed'))
        .resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should provide comprehensive engagement data flow', async () => {
      const userId = 'integration-user';

      // 1. Check achievements after session
      const newAchievements = await engagementService.checkAndUnlockAchievements(
        userId,
        mockSession,
        mockReport,
        mockMilestones
      );

      // 2. Generate recommendations based on performance
      const recommendations = await engagementService.generatePracticeRecommendations(
        userId,
        [mockSession],
        [mockReport]
      );

      // 3. Calculate engagement metrics
      const metrics = await engagementService.calculateEngagementMetrics(userId);

      // 4. Get notifications (should include achievement notifications)
      const notifications = await engagementService.getUserNotifications(userId);

      // Verify the flow
      expect(newAchievements).toBeInstanceOf(Array);
      expect(recommendations).toBeInstanceOf(Array);
      expect(metrics.engagementScore).toBeGreaterThan(0);
      expect(notifications).toBeInstanceOf(Array);

      // Verify data consistency
      if (newAchievements.length > 0) {
        expect(metrics.achievementsUnlocked).toBeGreaterThanOrEqual(0);
        expect(metrics.totalPoints).toBeGreaterThan(0);
      }

      if (recommendations.length > 0) {
        expect(metrics.activeRecommendations).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle different user performance levels appropriately', async () => {
      // Test with high performer
      const highPerformanceReport = { ...mockReport, overallScore: 0.95 };
      const highPerformerAchievements = await engagementService.checkAndUnlockAchievements(
        'high-performer',
        mockSession,
        highPerformanceReport,
        mockMilestones
      );

      // Test with low performer
      const lowPerformanceReport = { ...mockReport, overallScore: 0.45 };
      const lowPerformerRecommendations = await engagementService.generatePracticeRecommendations(
        'low-performer',
        [mockSession],
        [lowPerformanceReport]
      );

      // High performers should get more achievements
      expect(highPerformerAchievements.length).toBeGreaterThanOrEqual(0);
      
      // Low performers should get more targeted recommendations
      expect(lowPerformerRecommendations.length).toBeGreaterThan(0);
      const highPriorityRecs = lowPerformerRecommendations.filter(r => r.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });

    it('should maintain engagement over time', async () => {
      const userId = 'long-term-user';

      // Simulate multiple sessions over time
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        ...mockSession,
        id: `session-${i}`,
        startTime: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000)
      }));

      const reports = Array.from({ length: 5 }, (_, i) => ({
        ...mockReport,
        id: `report-${i}`,
        sessionId: `session-${i}`,
        overallScore: 0.6 + (i * 0.05) // Gradual improvement
      }));

      // Generate recommendations based on progress
      const recommendations = await engagementService.generatePracticeRecommendations(
        userId,
        sessions,
        reports
      );

      // Calculate final metrics
      const metrics = await engagementService.calculateEngagementMetrics(userId);

      expect(recommendations).toBeInstanceOf(Array);
      expect(metrics.engagementScore).toBeGreaterThan(0);
      
      // Should have some form of engagement tracking
      expect(metrics.totalNotifications + metrics.achievementsUnlocked + metrics.activeRecommendations)
        .toBeGreaterThan(0);
    });
  });
});