import { Request, Response } from 'express';
import { 
  DefaultUserEngagementService,
  Notification,
  Achievement,
  PracticeRecommendation,
  UserEngagementMetrics
} from '../services/user-engagement-service';
import { DefaultProgressTrackingService } from '../services/progress-tracking-service';
import { logger } from '../utils/logger';
import {
  CategoryScores,
  InterviewSession,
  PerformanceReport
} from '@ai-interview/types';

export class UserEngagementController {
  private engagementService: DefaultUserEngagementService;
  private progressService: DefaultProgressTrackingService;

  constructor() {
    this.engagementService = new DefaultUserEngagementService();
    this.progressService = new DefaultProgressTrackingService();
  }

  /**
   * Get user notifications
   * GET /api/reporting/engagement/:userId/notifications
   */
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit } = req.query;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      logger.info('Getting user notifications', { userId, limit });

      const notifications = await this.engagementService.getUserNotifications(
        userId,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: notifications,
        message: 'Notifications retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get user notifications', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATIONS_FETCH_FAILED',
          message: 'Failed to retrieve notifications'
        }
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /api/reporting/engagement/notifications/:notificationId/read
   */
  async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;

      if (!notificationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_NOTIFICATION_ID',
            message: 'Notification ID is required'
          }
        });
        return;
      }

      logger.info('Marking notification as read', { notificationId });

      await this.engagementService.markNotificationAsRead(notificationId);

      res.json({
        success: true,
        message: 'Notification marked as read'
      });

    } catch (error) {
      logger.error('Failed to mark notification as read', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_UPDATE_FAILED',
          message: 'Failed to update notification'
        }
      });
    }
  }

  /**
   * Schedule practice reminder
   * POST /api/reporting/engagement/:userId/reminders
   */
  async scheduleReminder(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { scheduledFor } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      if (!scheduledFor) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SCHEDULE_TIME',
            message: 'Scheduled time is required'
          }
        });
        return;
      }

      logger.info('Scheduling practice reminder', { userId, scheduledFor });

      const reminder = await this.engagementService.scheduleProgressReminder(
        userId,
        new Date(scheduledFor)
      );

      res.json({
        success: true,
        data: reminder,
        message: 'Practice reminder scheduled successfully'
      });

    } catch (error) {
      logger.error('Failed to schedule reminder', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'REMINDER_SCHEDULE_FAILED',
          message: 'Failed to schedule reminder'
        }
      });
    }
  }

  /**
   * Get user achievements
   * GET /api/reporting/engagement/:userId/achievements
   */
  async getUserAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      logger.info('Getting user achievements', { userId });

      const achievements = await this.engagementService.getUserAchievements(userId);
      const achievementProgress = await this.engagementService.calculateAchievementProgress(userId);

      const unlockedAchievements = achievements.filter(a => a.isUnlocked);
      const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);

      const achievementSummary = {
        achievements: achievementProgress,
        statistics: {
          unlocked: unlockedAchievements.length,
          total: achievements.length,
          completionRate: Math.round((unlockedAchievements.length / achievements.length) * 100),
          totalPoints,
          nextAchievement: achievements.find(a => !a.isUnlocked),
          recentUnlocks: unlockedAchievements
            .filter(a => a.unlockedAt && a.unlockedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
        }
      };

      res.json({
        success: true,
        data: achievementSummary,
        message: 'Achievements retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get user achievements', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'ACHIEVEMENTS_FETCH_FAILED',
          message: 'Failed to retrieve achievements'
        }
      });
    }
  }

  /**
   * Check for new achievements after session completion
   * POST /api/reporting/engagement/:userId/check-achievements
   */
  async checkAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { sessionData, reportData } = req.body;

      if (!userId || !sessionData || !reportData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_DATA',
            message: 'User ID, session data, and report data are required'
          }
        });
        return;
      }

      logger.info('Checking for new achievements', { userId, sessionId: sessionData.id });

      // Get current milestones for achievement checking
      const milestones = await this.progressService.trackMilestones(
        userId,
        reportData.categoryScores as CategoryScores
      );

      const newAchievements = await this.engagementService.checkAndUnlockAchievements(
        userId,
        sessionData as InterviewSession,
        reportData as PerformanceReport,
        milestones
      );

      res.json({
        success: true,
        data: {
          newAchievements,
          achievementCount: newAchievements.length
        },
        message: newAchievements.length > 0 
          ? `${newAchievements.length} new achievement(s) unlocked!`
          : 'No new achievements this time'
      });

    } catch (error) {
      logger.error('Failed to check achievements', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'ACHIEVEMENT_CHECK_FAILED',
          message: 'Failed to check for achievements'
        }
      });
    }
  }

  /**
   * Get practice recommendations
   * GET /api/reporting/engagement/:userId/recommendations
   */
  async getPracticeRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      logger.info('Getting practice recommendations', { userId });

      const recommendations = await this.engagementService.getUserPracticeRecommendations(userId);

      const recommendationSummary = {
        recommendations,
        statistics: {
          active: recommendations.filter(r => r.isActive && !r.completedAt).length,
          completed: recommendations.filter(r => r.completedAt).length,
          highPriority: recommendations.filter(r => r.priority === 'high' && r.isActive).length,
          totalEstimatedTime: recommendations
            .filter(r => r.isActive && !r.completedAt)
            .reduce((sum, r) => sum + r.estimatedTimeMinutes, 0)
        }
      };

      res.json({
        success: true,
        data: recommendationSummary,
        message: 'Practice recommendations retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get practice recommendations', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATIONS_FETCH_FAILED',
          message: 'Failed to retrieve practice recommendations'
        }
      });
    }
  }

  /**
   * Generate new practice recommendations
   * POST /api/reporting/engagement/:userId/recommendations/generate
   */
  async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { recentSessions, recentReports } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      if (!recentSessions || !recentReports) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SESSION_DATA',
            message: 'Recent sessions and reports are required'
          }
        });
        return;
      }

      logger.info('Generating practice recommendations', { 
        userId, 
        sessionCount: recentSessions.length,
        reportCount: recentReports.length 
      });

      const recommendations = await this.engagementService.generatePracticeRecommendations(
        userId,
        recentSessions as InterviewSession[],
        recentReports as PerformanceReport[]
      );

      res.json({
        success: true,
        data: recommendations,
        message: 'Practice recommendations generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate recommendations', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATION_GENERATION_FAILED',
          message: 'Failed to generate practice recommendations'
        }
      });
    }
  }

  /**
   * Mark recommendation as completed
   * PUT /api/reporting/engagement/recommendations/:recommendationId/complete
   */
  async completeRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId } = req.params;

      if (!recommendationId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_RECOMMENDATION_ID',
            message: 'Recommendation ID is required'
          }
        });
        return;
      }

      logger.info('Marking recommendation as completed', { recommendationId });

      await this.engagementService.markRecommendationCompleted(recommendationId);

      res.json({
        success: true,
        message: 'Recommendation marked as completed'
      });

    } catch (error) {
      logger.error('Failed to complete recommendation', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATION_COMPLETION_FAILED',
          message: 'Failed to mark recommendation as completed'
        }
      });
    }
  }

  /**
   * Get user engagement metrics
   * GET /api/reporting/engagement/:userId/metrics
   */
  async getEngagementMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      logger.info('Getting engagement metrics', { userId });

      const metrics = await this.engagementService.calculateEngagementMetrics(userId);

      res.json({
        success: true,
        data: metrics,
        message: 'Engagement metrics retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get engagement metrics', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'ENGAGEMENT_METRICS_FAILED',
          message: 'Failed to retrieve engagement metrics'
        }
      });
    }
  }

  /**
   * Update user engagement activity
   * POST /api/reporting/engagement/:userId/activity
   */
  async updateEngagement(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { activityType } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      if (!activityType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ACTIVITY_TYPE',
            message: 'Activity type is required'
          }
        });
        return;
      }

      logger.info('Updating user engagement', { userId, activityType });

      await this.engagementService.updateUserEngagement(userId, activityType);

      res.json({
        success: true,
        message: 'User engagement updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update engagement', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'ENGAGEMENT_UPDATE_FAILED',
          message: 'Failed to update user engagement'
        }
      });
    }
  }

  /**
   * Get engagement dashboard data
   * GET /api/reporting/engagement/:userId/dashboard
   */
  async getEngagementDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      logger.info('Getting engagement dashboard', { userId });

      // Fetch all engagement data
      const [metrics, notifications, achievements, recommendations] = await Promise.all([
        this.engagementService.calculateEngagementMetrics(userId),
        this.engagementService.getUserNotifications(userId, 5),
        this.engagementService.getUserAchievements(userId),
        this.engagementService.getUserPracticeRecommendations(userId)
      ]);

      const recentAchievements = achievements
        .filter(a => a.isUnlocked && a.unlockedAt && 
          a.unlockedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
        .slice(0, 3);

      const activeRecommendations = recommendations
        .filter(r => r.isActive && !r.completedAt)
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, 3);

      const dashboard = {
        metrics,
        recentNotifications: notifications.slice(0, 5),
        recentAchievements,
        activeRecommendations,
        quickStats: {
          unreadNotifications: metrics.unreadNotifications,
          newAchievements: recentAchievements.length,
          pendingRecommendations: activeRecommendations.length,
          engagementLevel: this.getEngagementLevel(metrics.engagementScore),
          streakStatus: {
            current: metrics.streakCount,
            isActive: metrics.streakCount > 0,
            nextMilestone: Math.ceil(metrics.streakCount / 5) * 5
          }
        }
      };

      res.json({
        success: true,
        data: dashboard,
        message: 'Engagement dashboard retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get engagement dashboard', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_FETCH_FAILED',
          message: 'Failed to retrieve engagement dashboard'
        }
      });
    }
  }

  private getEngagementLevel(score: number): string {
    if (score >= 80) return 'Highly Engaged';
    if (score >= 60) return 'Engaged';
    if (score >= 40) return 'Moderately Engaged';
    if (score >= 20) return 'Low Engagement';
    return 'Inactive';
  }
}