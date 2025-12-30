import { Request, Response } from 'express';
import { 
  DefaultProgressTrackingService,
  ProgressAnalysis,
  ProgressMetrics,
  BenchmarkData,
  Milestone
} from '../services/progress-tracking-service';
import { logger } from '../utils/logger';
import {
  CategoryScores,
  InterviewSession,
  PerformanceReport,
  ProgressDataPoint,
  TrendData
} from '@ai-interview/types';

export class ProgressController {
  private progressService: DefaultProgressTrackingService;

  constructor() {
    this.progressService = new DefaultProgressTrackingService();
  }

  /**
   * Get comprehensive progress analysis for a user
   * GET /api/reporting/progress/:userId
   */
  async getUserProgress(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeframe } = req.query;

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

      logger.info('Getting user progress analysis', { userId, timeframe });

      const timeframeMonths = timeframe ? parseInt(timeframe as string) : 6;
      const progressAnalysis = await this.progressService.analyzeUserProgress(
        userId,
        timeframeMonths
      );

      res.json({
        success: true,
        data: progressAnalysis,
        message: 'Progress analysis retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get user progress', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PROGRESS_ANALYSIS_FAILED',
          message: 'Failed to analyze user progress'
        }
      });
    }
  }

  /**
   * Generate trend analysis for user sessions
   * POST /api/reporting/progress/trend-analysis
   */
  async generateTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { sessions, reports } = req.body;

      if (!sessions || !reports) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_DATA',
            message: 'Sessions and reports are required'
          }
        });
        return;
      }

      logger.info('Generating trend analysis', {
        sessionCount: sessions.length,
        reportCount: reports.length
      });

      const trendAnalysis = await this.progressService.generateTrendAnalysis(
        sessions as InterviewSession[],
        reports as PerformanceReport[]
      );

      res.json({
        success: true,
        data: trendAnalysis,
        message: 'Trend analysis generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate trend analysis', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'TREND_ANALYSIS_FAILED',
          message: 'Failed to generate trend analysis'
        }
      });
    }
  }

  /**
   * Get benchmark comparison for user scores
   * POST /api/reporting/progress/benchmark-comparison
   */
  async getBenchmarkComparison(req: Request, res: Response): Promise<void> {
    try {
      const { userScores, industry, role } = req.body;

      if (!userScores || !industry || !role) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'userScores, industry, and role are required'
          }
        });
        return;
      }

      logger.info('Calculating benchmark comparison', { industry, role });

      const benchmarkComparison = await this.progressService.calculateBenchmarkComparison(
        userScores as CategoryScores,
        industry as string,
        role as string
      );

      res.json({
        success: true,
        data: benchmarkComparison,
        message: 'Benchmark comparison calculated successfully'
      });

    } catch (error) {
      logger.error('Failed to calculate benchmark comparison', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'BENCHMARK_COMPARISON_FAILED',
          message: 'Failed to calculate benchmark comparison'
        }
      });
    }
  }

  /**
   * Track milestones for a user
   * POST /api/reporting/progress/milestones
   */
  async trackMilestones(req: Request, res: Response): Promise<void> {
    try {
      const { userId, currentScores } = req.body;

      if (!userId || !currentScores) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'userId and currentScores are required'
          }
        });
        return;
      }

      logger.info('Tracking user milestones', { userId });

      const milestones = await this.progressService.trackMilestones(
        userId as string,
        currentScores as CategoryScores
      );

      res.json({
        success: true,
        data: milestones,
        message: 'Milestones tracked successfully'
      });

    } catch (error) {
      logger.error('Failed to track milestones', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'MILESTONE_TRACKING_FAILED',
          message: 'Failed to track milestones'
        }
      });
    }
  }

  /**
   * Generate progress visualization data
   * POST /api/reporting/progress/visualization
   */
  async generateProgressVisualization(req: Request, res: Response): Promise<void> {
    try {
      const { sessions, reports } = req.body;

      if (!sessions || !reports) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_DATA',
            message: 'Sessions and reports are required'
          }
        });
        return;
      }

      logger.info('Generating progress visualization', {
        sessionCount: sessions.length,
        reportCount: reports.length
      });

      const visualizationData = await this.progressService.generateProgressVisualization(
        sessions as InterviewSession[],
        reports as PerformanceReport[]
      );

      res.json({
        success: true,
        data: visualizationData,
        message: 'Progress visualization generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate progress visualization', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PROGRESS_VISUALIZATION_FAILED',
          message: 'Failed to generate progress visualization'
        }
      });
    }
  }

  /**
   * Get progress summary for dashboard
   * GET /api/reporting/progress/:userId/summary
   */
  async getProgressSummary(req: Request, res: Response): Promise<void> {
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

      logger.info('Getting progress summary', { userId });

      // Get recent progress analysis
      const progressAnalysis = await this.progressService.analyzeUserProgress(userId, 3); // Last 3 months

      // Create summary
      const summary = {
        overallImprovement: progressAnalysis.metrics.overallImprovement,
        recentTrend: progressAnalysis.metrics.recentTrend,
        totalSessions: progressAnalysis.metrics.totalSessions,
        bestScore: progressAnalysis.metrics.bestScore,
        currentPercentile: progressAnalysis.benchmarkComparison.userPercentile,
        achievedMilestones: progressAnalysis.milestones.filter(m => m.isAchieved).length,
        totalMilestones: progressAnalysis.milestones.length,
        topRecommendation: progressAnalysis.recommendations[0] || 'Keep practicing regularly',
        streakCount: progressAnalysis.metrics.streakCount,
        consistencyScore: progressAnalysis.metrics.consistencyScore
      };

      res.json({
        success: true,
        data: summary,
        message: 'Progress summary retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get progress summary', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PROGRESS_SUMMARY_FAILED',
          message: 'Failed to get progress summary'
        }
      });
    }
  }

  /**
   * Get detailed milestone information
   * GET /api/reporting/progress/:userId/milestones
   */
  async getUserMilestones(req: Request, res: Response): Promise<void> {
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

      logger.info('Getting user milestones', { userId });

      // For this endpoint, we need current scores - in a real app, this would fetch the latest scores
      const mockCurrentScores: CategoryScores = {
        communication: 0.75,
        technicalAccuracy: 0.82,
        confidence: 0.68,
        clarity: 0.79,
        structure: 0.73,
        relevance: 0.81
      };

      const milestones = await this.progressService.trackMilestones(userId, mockCurrentScores);

      // Add additional milestone statistics
      const milestoneStats = {
        achieved: milestones.filter(m => m.isAchieved).length,
        total: milestones.length,
        completionRate: Math.round((milestones.filter(m => m.isAchieved).length / milestones.length) * 100),
        nextMilestone: milestones.find(m => !m.isAchieved),
        recentAchievements: milestones.filter(m => m.isAchieved && m.achievedAt && 
          m.achievedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      };

      res.json({
        success: true,
        data: {
          milestones,
          statistics: milestoneStats
        },
        message: 'User milestones retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get user milestones', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_MILESTONES_FAILED',
          message: 'Failed to get user milestones'
        }
      });
    }
  }

  /**
   * Compare user with industry/role benchmarks
   * GET /api/reporting/progress/:userId/comparison
   */
  async getDetailedComparison(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { industry, role } = req.query;

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

      logger.info('Getting detailed comparison', { userId, industry, role });

      // Get user's latest progress analysis
      const progressAnalysis = await this.progressService.analyzeUserProgress(userId, 6);
      
      // Get benchmark comparison with specified industry/role or use defaults
      const userIndustry = (industry as string) || 'Technology';
      const userRole = (role as string) || 'Software Engineer';
      
      const benchmarkComparison = await this.progressService.calculateBenchmarkComparison(
        progressAnalysis.metrics.categoryImprovements, // Use latest scores
        userIndustry,
        userRole
      );

      // Create detailed comparison
      const detailedComparison = {
        userPerformance: progressAnalysis.metrics,
        benchmarks: benchmarkComparison,
        industryContext: userIndustry,
        roleContext: userRole,
        improvementOpportunities: this.identifyImprovementOpportunities(
          progressAnalysis.metrics.categoryImprovements,
          benchmarkComparison
        ),
        competitiveAdvantages: this.identifyCompetitiveAdvantages(
          progressAnalysis.metrics.categoryImprovements,
          benchmarkComparison
        )
      };

      res.json({
        success: true,
        data: detailedComparison,
        message: 'Detailed comparison retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get detailed comparison', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'DETAILED_COMPARISON_FAILED',
          message: 'Failed to get detailed comparison'
        }
      });
    }
  }

  private identifyImprovementOpportunities(
    userScores: CategoryScores,
    benchmarks: BenchmarkData
  ): Array<{ category: string; gap: number; priority: 'high' | 'medium' | 'low' }> {
    const opportunities: Array<{ category: string; gap: number; priority: 'high' | 'medium' | 'low' }> = [];

    Object.entries(userScores).forEach(([category, userScore]) => {
      const industryAvg = benchmarks.industryAverage[category as keyof CategoryScores];
      const roleAvg = benchmarks.roleAverage[category as keyof CategoryScores];
      const topPerformer = benchmarks.topPerformerBenchmark[category as keyof CategoryScores];

      const avgBenchmark = (industryAvg + roleAvg) / 2;
      const gap = avgBenchmark - userScore;

      if (gap > 0.1) {
        opportunities.push({
          category,
          gap: Math.round(gap * 100) / 100,
          priority: gap > 0.2 ? 'high' : gap > 0.15 ? 'medium' : 'low'
        });
      }
    });

    return opportunities.sort((a, b) => b.gap - a.gap);
  }

  private identifyCompetitiveAdvantages(
    userScores: CategoryScores,
    benchmarks: BenchmarkData
  ): Array<{ category: string; advantage: number; level: 'exceptional' | 'strong' | 'moderate' }> {
    const advantages: Array<{ category: string; advantage: number; level: 'exceptional' | 'strong' | 'moderate' }> = [];

    Object.entries(userScores).forEach(([category, userScore]) => {
      const industryAvg = benchmarks.industryAverage[category as keyof CategoryScores];
      const roleAvg = benchmarks.roleAverage[category as keyof CategoryScores];

      const avgBenchmark = (industryAvg + roleAvg) / 2;
      const advantage = userScore - avgBenchmark;

      if (advantage > 0.05) {
        advantages.push({
          category,
          advantage: Math.round(advantage * 100) / 100,
          level: advantage > 0.2 ? 'exceptional' : advantage > 0.1 ? 'strong' : 'moderate'
        });
      }
    });

    return advantages.sort((a, b) => b.advantage - a.advantage);
  }
}