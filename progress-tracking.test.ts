import { DefaultProgressTrackingService } from '../services/progress-tracking-service';
import {
  CategoryScores,
  InterviewSession,
  PerformanceReport,
  InterviewConfig,
} from '@ai-interview/types';

describe('Progress Tracking Service', () => {
  let progressService: DefaultProgressTrackingService;

  beforeEach(() => {
    progressService = new DefaultProgressTrackingService();
  });

  const mockCategoryScores: CategoryScores = {
    communication: 0.75,
    technicalAccuracy: 0.82,
    confidence: 0.68,
    clarity: 0.79,
    structure: 0.73,
    relevance: 0.81,
  };

  const mockSessions: InterviewSession[] = [
    {
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
    },
    {
      id: 'session-2',
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
      startTime: new Date('2023-02-01'),
      endTime: new Date('2023-02-01'),
      duration: 3600,
      metadata: {},
    },
  ];

  const mockReports: PerformanceReport[] = [
    {
      id: 'report-1',
      sessionId: 'session-1',
      userId: 'user-123',
      overallScore: 0.65,
      categoryScores: {
        communication: 0.60,
        technicalAccuracy: 0.70,
        confidence: 0.55,
        clarity: 0.65,
        structure: 0.60,
        relevance: 0.75,
      },
      strengths: ['relevance'],
      weaknesses: ['confidence'],
      improvementPlan: {
        priorityAreas: ['confidence'],
        recommendations: [],
        practiceExercises: [],
        estimatedTimeToImprove: 14,
      },
      benchmarkComparison: {
        percentile: 45,
        averageScore: 0.65,
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
        categoryBreakdown: { type: 'donut', segments: [], totalScore: 0.65 },
      },
      createdAt: new Date('2023-01-01'),
    },
    {
      id: 'report-2',
      sessionId: 'session-2',
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
      createdAt: new Date('2023-02-01'),
    },
  ];

  describe('analyzeUserProgress', () => {
    it('should analyze user progress successfully', async () => {
      const analysis = await progressService.analyzeUserProgress('user-123', 6);

      expect(analysis).toBeDefined();
      expect(analysis.timeframe).toBe('6 months');
      expect(analysis.metrics).toBeDefined();
      expect(analysis.trendAnalysis).toBeDefined();
      expect(analysis.benchmarkComparison).toBeDefined();
      expect(analysis.milestones).toBeInstanceOf(Array);
      expect(analysis.recommendations).toBeInstanceOf(Array);

      // Check metrics structure
      expect(analysis.metrics.totalSessions).toBeGreaterThan(0);
      expect(analysis.metrics.overallImprovement).toBeDefined();
      expect(analysis.metrics.categoryImprovements).toBeDefined();
      expect(analysis.metrics.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.streakCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty session data gracefully', async () => {
      // Mock the service to return empty data
      const originalFetch = progressService['fetchUserSessions'];
      progressService['fetchUserSessions'] = jest.fn().mockResolvedValue([]);

      await expect(progressService.analyzeUserProgress('empty-user', 6))
        .rejects.toThrow('No sessions found for user empty-user');

      // Restore original method
      progressService['fetchUserSessions'] = originalFetch;
    });
  });

  describe('generateTrendAnalysis', () => {
    it('should generate trend analysis for improving performance', async () => {
      const trendAnalysis = await progressService.generateTrendAnalysis(
        mockSessions,
        mockReports
      );

      expect(trendAnalysis).toBeDefined();
      expect(trendAnalysis.slope).toBeDefined();
      expect(trendAnalysis.direction).toMatch(/^(improving|declining|stable)$/);
      expect(trendAnalysis.confidence).toBeGreaterThanOrEqual(0);
      expect(trendAnalysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle single session gracefully', async () => {
      const singleSession = [mockSessions[0]];
      const singleReport = [mockReports[0]];

      const trendAnalysis = await progressService.generateTrendAnalysis(
        singleSession,
        singleReport
      );

      expect(trendAnalysis.slope).toBe(0);
      expect(trendAnalysis.direction).toBe('stable');
      expect(trendAnalysis.confidence).toBe(0);
    });

    it('should detect improving trend', async () => {
      // Create reports with clear improvement
      const improvingReports = [
        { ...mockReports[0], overallScore: 0.5 },
        { ...mockReports[1], overallScore: 0.8 },
      ];

      const trendAnalysis = await progressService.generateTrendAnalysis(
        mockSessions,
        improvingReports
      );

      expect(trendAnalysis.direction).toBe('improving');
      expect(trendAnalysis.slope).toBeGreaterThan(0);
    });
  });

  describe('calculateBenchmarkComparison', () => {
    it('should calculate benchmark comparison', async () => {
      const benchmarkComparison = await progressService.calculateBenchmarkComparison(
        mockCategoryScores,
        'Technology',
        'Software Engineer'
      );

      expect(benchmarkComparison).toBeDefined();
      expect(benchmarkComparison.userPercentile).toBeGreaterThanOrEqual(5);
      expect(benchmarkComparison.userPercentile).toBeLessThanOrEqual(95);
      expect(benchmarkComparison.industryAverage).toBeDefined();
      expect(benchmarkComparison.roleAverage).toBeDefined();
      expect(benchmarkComparison.topPerformerBenchmark).toBeDefined();
      expect(benchmarkComparison.comparisonInsights).toBeInstanceOf(Array);
      expect(benchmarkComparison.comparisonInsights.length).toBeGreaterThan(0);
    });

    it('should provide different benchmarks for different industries', async () => {
      const techBenchmark = await progressService.calculateBenchmarkComparison(
        mockCategoryScores,
        'Technology',
        'Software Engineer'
      );

      const financeBenchmark = await progressService.calculateBenchmarkComparison(
        mockCategoryScores,
        'Finance',
        'Software Engineer'
      );

      // Industry averages should be different
      expect(techBenchmark.industryAverage).not.toEqual(financeBenchmark.industryAverage);
    });

    it('should generate meaningful insights', async () => {
      const benchmarkComparison = await progressService.calculateBenchmarkComparison(
        mockCategoryScores,
        'Technology',
        'Software Engineer'
      );

      expect(benchmarkComparison.comparisonInsights.length).toBeGreaterThan(0);
      expect(benchmarkComparison.comparisonInsights[0]).toContain('performing');
    });
  });

  describe('trackMilestones', () => {
    it('should track user milestones', async () => {
      const milestones = await progressService.trackMilestones(
        'user-123',
        mockCategoryScores
      );

      expect(milestones).toBeInstanceOf(Array);
      expect(milestones.length).toBeGreaterThan(0);

      const milestone = milestones[0];
      expect(milestone.id).toBeDefined();
      expect(milestone.title).toBeDefined();
      expect(milestone.description).toBeDefined();
      expect(milestone.targetValue).toBeGreaterThan(0);
      expect(milestone.currentValue).toBeGreaterThanOrEqual(0);
      expect(milestone.category).toBeDefined();
      expect(typeof milestone.isAchieved).toBe('boolean');
    });

    it('should correctly identify achieved milestones', async () => {
      const highScores: CategoryScores = {
        communication: 0.85,
        technicalAccuracy: 0.90,
        confidence: 0.80,
        clarity: 0.85,
        structure: 0.80,
        relevance: 0.85,
      };

      const milestones = await progressService.trackMilestones('user-123', highScores);
      const achievedMilestones = milestones.filter(m => m.isAchieved);

      expect(achievedMilestones.length).toBeGreaterThan(0);
      
      // Check that achieved milestones have achievement dates
      achievedMilestones.forEach(milestone => {
        if (milestone.isAchieved) {
          expect(milestone.achievedAt).toBeDefined();
        }
      });
    });

    it('should handle low scores appropriately', async () => {
      const lowScores: CategoryScores = {
        communication: 0.3,
        technicalAccuracy: 0.4,
        confidence: 0.2,
        clarity: 0.3,
        structure: 0.3,
        relevance: 0.4,
      };

      const milestones = await progressService.trackMilestones('user-123', lowScores);
      const achievedMilestones = milestones.filter(m => m.isAchieved);

      // With low scores, few or no milestones should be achieved
      expect(achievedMilestones.length).toBeLessThanOrEqual(1);
    });
  });

  describe('generateProgressVisualization', () => {
    it('should generate progress visualization data', async () => {
      const visualizationData = await progressService.generateProgressVisualization(
        mockSessions,
        mockReports
      );

      expect(visualizationData).toBeInstanceOf(Array);
      expect(visualizationData.length).toBe(Math.min(mockSessions.length, mockReports.length));

      if (visualizationData.length > 0) {
        const dataPoint = visualizationData[0];
        expect(dataPoint.timestamp).toBeDefined();
        expect(dataPoint.overallScore).toBeGreaterThanOrEqual(0);
        expect(dataPoint.overallScore).toBeLessThanOrEqual(1);
        expect(dataPoint.categoryScores).toBeDefined();
        expect(dataPoint.sessionId).toBeDefined();
      }
    });

    it('should sort data points by timestamp', async () => {
      const visualizationData = await progressService.generateProgressVisualization(
        mockSessions,
        mockReports
      );

      if (visualizationData.length > 1) {
        for (let i = 1; i < visualizationData.length; i++) {
          expect(visualizationData[i].timestamp).toBeGreaterThanOrEqual(
            visualizationData[i - 1].timestamp
          );
        }
      }
    });

    it('should handle empty data gracefully', async () => {
      const visualizationData = await progressService.generateProgressVisualization([], []);
      expect(visualizationData).toEqual([]);
    });

    it('should handle mismatched session and report counts', async () => {
      const extraSession = { ...mockSessions[0], id: 'session-3' };
      const sessionsWithExtra = [...mockSessions, extraSession];

      const visualizationData = await progressService.generateProgressVisualization(
        sessionsWithExtra,
        mockReports
      );

      // Should only create data points for matching sessions and reports
      expect(visualizationData.length).toBe(mockReports.length);
    });
  });

  describe('Integration', () => {
    it('should provide comprehensive progress analysis', async () => {
      const analysis = await progressService.analyzeUserProgress('user-123', 6);

      // Verify all components are present and consistent
      expect(analysis.metrics.totalSessions).toBeGreaterThan(0);
      expect(analysis.trendAnalysis.direction).toMatch(/^(improving|declining|stable)$/);
      expect(analysis.benchmarkComparison.userPercentile).toBeGreaterThan(0);
      expect(analysis.milestones.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      // Verify data consistency
      if (analysis.metrics.overallImprovement > 0.1) {
        expect(analysis.trendAnalysis.direction).toBe('improving');
      }

      // Verify milestone logic
      const achievedMilestones = analysis.milestones.filter(m => m.isAchieved);
      if (analysis.benchmarkComparison.userPercentile > 70) {
        expect(achievedMilestones.length).toBeGreaterThan(0);
      }
    });

    it('should handle different user performance levels appropriately', async () => {
      // Test with different user IDs to simulate different performance levels
      const highPerformerAnalysis = await progressService.analyzeUserProgress('high-performer', 6);
      const lowPerformerAnalysis = await progressService.analyzeUserProgress('low-performer', 6);

      // Both should return valid analyses
      expect(highPerformerAnalysis.metrics).toBeDefined();
      expect(lowPerformerAnalysis.metrics).toBeDefined();

      // Both should have recommendations
      expect(highPerformerAnalysis.recommendations.length).toBeGreaterThan(0);
      expect(lowPerformerAnalysis.recommendations.length).toBeGreaterThan(0);
    });
  });
});