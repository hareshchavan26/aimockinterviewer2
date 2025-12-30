import {
  CategoryScores,
  InterviewSession,
  PerformanceReport,
  ProgressDataPoint,
  TrendData,
} from '@ai-interview/types';
import { logger } from '../utils/logger';

export interface ProgressMetrics {
  overallImprovement: number;
  categoryImprovements: CategoryScores;
  consistencyScore: number;
  streakCount: number;
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

export interface BenchmarkData {
  userPercentile: number;
  industryAverage: CategoryScores;
  roleAverage: CategoryScores;
  topPerformerBenchmark: CategoryScores;
  comparisonInsights: string[];
}

export interface ProgressAnalysis {
  timeframe: string;
  metrics: ProgressMetrics;
  trendAnalysis: TrendData;
  benchmarkComparison: BenchmarkData;
  milestones: Milestone[];
  recommendations: string[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt?: Date;
  targetValue: number;
  currentValue: number;
  category: string;
  isAchieved: boolean;
}

export interface ProgressTrackingService {
  analyzeUserProgress(
    userId: string,
    timeframeMonths?: number
  ): Promise<ProgressAnalysis>;
  
  generateTrendAnalysis(
    sessions: InterviewSession[],
    reports: PerformanceReport[]
  ): Promise<TrendData>;
  
  calculateBenchmarkComparison(
    userScores: CategoryScores,
    industry: string,
    role: string
  ): Promise<BenchmarkData>;
  
  trackMilestones(
    userId: string,
    currentScores: CategoryScores
  ): Promise<Milestone[]>;
  
  generateProgressVisualization(
    sessions: InterviewSession[],
    reports: PerformanceReport[]
  ): Promise<ProgressDataPoint[]>;
}

export class DefaultProgressTrackingService implements ProgressTrackingService {
  
  async analyzeUserProgress(
    userId: string,
    timeframeMonths: number = 6
  ): Promise<ProgressAnalysis> {
    try {
      logger.info('Analyzing user progress', { userId, timeframeMonths });

      // In a real implementation, these would fetch from database
      const sessions = await this.fetchUserSessions(userId, timeframeMonths);
      const reports = await this.fetchUserReports(userId, timeframeMonths);

      if (sessions.length === 0) {
        throw new Error(`No sessions found for user ${userId}`);
      }

      // Calculate progress metrics
      const metrics = this.calculateProgressMetrics(sessions, reports);
      
      // Generate trend analysis
      const trendAnalysis = await this.generateTrendAnalysis(sessions, reports);
      
      // Get benchmark comparison
      const latestSession = sessions[sessions.length - 1];
      const latestReport = reports[reports.length - 1];
      const benchmarkComparison = await this.calculateBenchmarkComparison(
        latestReport?.categoryScores || this.getDefaultCategoryScores(),
        latestSession.config.industry,
        latestSession.config.role
      );
      
      // Track milestones
      const milestones = await this.trackMilestones(
        userId,
        latestReport?.categoryScores || this.getDefaultCategoryScores()
      );
      
      // Generate recommendations
      const recommendations = this.generateProgressRecommendations(
        metrics,
        trendAnalysis,
        benchmarkComparison
      );

      const analysis: ProgressAnalysis = {
        timeframe: `${timeframeMonths} months`,
        metrics,
        trendAnalysis,
        benchmarkComparison,
        milestones,
        recommendations,
      };

      logger.info('User progress analysis completed', {
        userId,
        totalSessions: sessions.length,
        overallImprovement: metrics.overallImprovement
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze user progress', { userId, error });
      throw error;
    }
  }

  async generateTrendAnalysis(
    sessions: InterviewSession[],
    reports: PerformanceReport[]
  ): Promise<TrendData> {
    if (sessions.length < 2) {
      return {
        slope: 0,
        direction: 'stable',
        confidence: 0
      };
    }

    // Extract scores over time
    const scoreData = reports.map((report, index) => ({
      timestamp: sessions[index]?.startTime.getTime() || Date.now(),
      score: report.overallScore
    })).sort((a, b) => a.timestamp - b.timestamp);

    // Calculate linear regression
    const n = scoreData.length;
    const sumX = scoreData.reduce((sum, point, index) => sum + index, 0);
    const sumY = scoreData.reduce((sum, point) => sum + point.score, 0);
    const sumXY = scoreData.reduce((sum, point, index) => sum + (index * point.score), 0);
    const sumXX = scoreData.reduce((sum, _, index) => sum + (index * index), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine direction and confidence
    let direction: 'improving' | 'declining' | 'stable';
    if (slope > 0.02) {
      direction = 'improving';
    } else if (slope < -0.02) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }

    // Calculate confidence based on R-squared
    const meanY = sumY / n;
    const ssTotal = scoreData.reduce((sum, point) => sum + Math.pow(point.score - meanY, 2), 0);
    const ssResidual = scoreData.reduce((sum, point, index) => {
      const predicted = meanY + slope * (index - (n - 1) / 2);
      return sum + Math.pow(point.score - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssResidual / ssTotal);
    const confidence = Math.max(0, Math.min(1, rSquared));

    return {
      slope,
      direction,
      confidence
    };
  }

  async calculateBenchmarkComparison(
    userScores: CategoryScores,
    industry: string,
    role: string
  ): Promise<BenchmarkData> {
    // In a real implementation, this would fetch actual benchmark data
    const industryBenchmarks = this.getIndustryBenchmarks(industry);
    const roleBenchmarks = this.getRoleBenchmarks(role);
    const topPerformerBenchmarks = this.getTopPerformerBenchmarks();

    // Calculate user percentile
    const overallUserScore = Object.values(userScores).reduce((sum, score) => sum + score, 0) / 6;
    const overallIndustryAvg = Object.values(industryBenchmarks).reduce((sum, score) => sum + score, 0) / 6;
    
    const userPercentile = Math.min(95, Math.max(5, 
      50 + ((overallUserScore - overallIndustryAvg) / overallIndustryAvg) * 100
    ));

    // Generate comparison insights
    const comparisonInsights = this.generateComparisonInsights(
      userScores,
      industryBenchmarks,
      roleBenchmarks,
      userPercentile
    );

    return {
      userPercentile: Math.round(userPercentile),
      industryAverage: industryBenchmarks,
      roleAverage: roleBenchmarks,
      topPerformerBenchmark: topPerformerBenchmarks,
      comparisonInsights
    };
  }

  async trackMilestones(
    userId: string,
    currentScores: CategoryScores
  ): Promise<Milestone[]> {
    const milestones: Milestone[] = [];

    // Define standard milestones
    const milestoneDefinitions = [
      {
        title: 'Communication Competency',
        description: 'Achieve 70% or higher in communication skills',
        category: 'communication',
        targetValue: 0.7
      },
      {
        title: 'Technical Excellence',
        description: 'Achieve 80% or higher in technical accuracy',
        category: 'technicalAccuracy',
        targetValue: 0.8
      },
      {
        title: 'Confidence Mastery',
        description: 'Achieve 75% or higher in confidence',
        category: 'confidence',
        targetValue: 0.75
      },
      {
        title: 'Overall Proficiency',
        description: 'Achieve 75% or higher across all categories',
        category: 'overall',
        targetValue: 0.75
      },
      {
        title: 'Consistency Champion',
        description: 'Maintain 70%+ scores for 5 consecutive sessions',
        category: 'consistency',
        targetValue: 5
      }
    ];

    milestoneDefinitions.forEach((def, index) => {
      let currentValue: number;
      let isAchieved: boolean;

      if (def.category === 'overall') {
        currentValue = Object.values(currentScores).reduce((sum, score) => sum + score, 0) / 6;
        isAchieved = currentValue >= def.targetValue;
      } else if (def.category === 'consistency') {
        // This would require session history analysis
        currentValue = 3; // Mock value
        isAchieved = currentValue >= def.targetValue;
      } else {
        currentValue = currentScores[def.category as keyof CategoryScores] || 0;
        isAchieved = currentValue >= def.targetValue;
      }

      milestones.push({
        id: `milestone_${index + 1}`,
        title: def.title,
        description: def.description,
        targetValue: def.targetValue,
        currentValue: Math.round(currentValue * 100) / 100,
        category: def.category,
        isAchieved,
        achievedAt: isAchieved ? new Date() : undefined
      });
    });

    return milestones;
  }

  async generateProgressVisualization(
    sessions: InterviewSession[],
    reports: PerformanceReport[]
  ): Promise<ProgressDataPoint[]> {
    const dataPoints: ProgressDataPoint[] = [];

    for (let i = 0; i < Math.min(sessions.length, reports.length); i++) {
      const session = sessions[i];
      const report = reports[i];

      dataPoints.push({
        timestamp: session.startTime.getTime(),
        overallScore: report.overallScore,
        categoryScores: report.categoryScores,
        sessionId: session.id
      });
    }

    // Sort by timestamp
    return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculateProgressMetrics(
    sessions: InterviewSession[],
    reports: PerformanceReport[]
  ): ProgressMetrics {
    if (reports.length === 0) {
      return this.getDefaultProgressMetrics();
    }

    const scores = reports.map(r => r.overallScore);
    const categoryScoresArray = reports.map(r => r.categoryScores);

    // Calculate overall improvement
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const overallImprovement = lastScore - firstScore;

    // Calculate category improvements
    const firstCategoryScores = categoryScoresArray[0];
    const lastCategoryScores = categoryScoresArray[categoryScoresArray.length - 1];
    
    const categoryImprovements: CategoryScores = {
      communication: lastCategoryScores.communication - firstCategoryScores.communication,
      technicalAccuracy: lastCategoryScores.technicalAccuracy - firstCategoryScores.technicalAccuracy,
      confidence: lastCategoryScores.confidence - firstCategoryScores.confidence,
      clarity: lastCategoryScores.clarity - firstCategoryScores.clarity,
      structure: lastCategoryScores.structure - firstCategoryScores.structure,
      relevance: lastCategoryScores.relevance - firstCategoryScores.relevance,
    };

    // Calculate consistency score (lower variance = higher consistency)
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const consistencyScore = Math.max(0, 1 - variance);

    // Calculate streak count (consecutive sessions above average)
    let streakCount = 0;
    for (let i = scores.length - 1; i >= 0; i--) {
      if (scores[i] >= avgScore) {
        streakCount++;
      } else {
        break;
      }
    }

    // Determine recent trend
    const recentScores = scores.slice(-3); // Last 3 sessions
    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (recentScores.length >= 2) {
      const recentImprovement = recentScores[recentScores.length - 1] - recentScores[0];
      if (recentImprovement > 0.05) {
        recentTrend = 'improving';
      } else if (recentImprovement < -0.05) {
        recentTrend = 'declining';
      }
    }

    return {
      overallImprovement: Math.round(overallImprovement * 100) / 100,
      categoryImprovements,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      streakCount,
      totalSessions: sessions.length,
      averageScore: Math.round(avgScore * 100) / 100,
      bestScore: Math.round(Math.max(...scores) * 100) / 100,
      recentTrend
    };
  }

  private generateProgressRecommendations(
    metrics: ProgressMetrics,
    trendAnalysis: TrendData,
    benchmarkComparison: BenchmarkData
  ): string[] {
    const recommendations: string[] = [];

    // Trend-based recommendations
    if (trendAnalysis.direction === 'declining') {
      recommendations.push('Focus on consistency - your recent performance shows a declining trend. Consider reviewing fundamentals.');
    } else if (trendAnalysis.direction === 'improving') {
      recommendations.push('Great progress! Keep up the momentum with regular practice sessions.');
    } else {
      recommendations.push('Your performance is stable. Consider challenging yourself with harder questions to continue growing.');
    }

    // Consistency recommendations
    if (metrics.consistencyScore < 0.7) {
      recommendations.push('Work on consistency - your scores vary significantly between sessions. Focus on establishing a routine.');
    }

    // Benchmark recommendations
    if (benchmarkComparison.userPercentile < 50) {
      recommendations.push('You\'re below industry average. Focus on your weakest categories for maximum improvement.');
    } else if (benchmarkComparison.userPercentile > 80) {
      recommendations.push('Excellent performance! You\'re in the top 20%. Consider mentoring others or tackling advanced challenges.');
    }

    // Category-specific recommendations
    const weakestCategory = Object.entries(metrics.categoryImprovements)
      .sort(([,a], [,b]) => a - b)[0];
    
    if (weakestCategory && weakestCategory[1] < 0) {
      recommendations.push(`Focus on ${weakestCategory[0]} - this area shows declining performance.`);
    }

    return recommendations;
  }

  private async fetchUserSessions(userId: string, timeframeMonths: number): Promise<InterviewSession[]> {
    // Mock implementation - in real app, this would query the database
    logger.info('Fetching user sessions', { userId, timeframeMonths });
    
    // Generate mock sessions for demonstration
    const sessions: InterviewSession[] = [];
    const now = new Date();
    
    for (let i = 0; i < 5; i++) {
      const sessionDate = new Date(now);
      sessionDate.setMonth(sessionDate.getMonth() - i);
      
      sessions.push({
        id: `session_${userId}_${i}`,
        userId,
        config: {
          industry: 'Technology',
          role: 'Software Engineer',
          company: 'TechCorp',
          difficulty: 'medium',
          questionTypes: ['behavioral', 'technical'],
          timeLimit: 3600,
          interviewerPersonality: 'friendly'
        },
        status: 'completed',
        questions: [],
        responses: [],
        startTime: sessionDate,
        endTime: new Date(sessionDate.getTime() + 3600000),
        duration: 3600,
        metadata: {}
      } as InterviewSession);
    }
    
    return sessions.reverse(); // Oldest first
  }

  private async fetchUserReports(userId: string, timeframeMonths: number): Promise<PerformanceReport[]> {
    // Mock implementation - in real app, this would query the database
    logger.info('Fetching user reports', { userId, timeframeMonths });
    
    // Generate mock reports showing improvement over time
    const reports: PerformanceReport[] = [];
    const baseScore = 0.6;
    
    for (let i = 0; i < 5; i++) {
      const improvement = i * 0.05; // Gradual improvement
      const sessionScore = Math.min(0.95, baseScore + improvement + (Math.random() - 0.5) * 0.1);
      
      const categoryScores: CategoryScores = {
        communication: Math.min(0.95, baseScore + improvement + (Math.random() - 0.5) * 0.1),
        technicalAccuracy: Math.min(0.95, baseScore + improvement + (Math.random() - 0.5) * 0.1),
        confidence: Math.min(0.95, baseScore + improvement + (Math.random() - 0.5) * 0.1),
        clarity: Math.min(0.95, baseScore + improvement + (Math.random() - 0.5) * 0.1),
        structure: Math.min(0.95, baseScore + improvement + (Math.random() - 0.5) * 0.1),
        relevance: Math.min(0.95, baseScore + improvement + (Math.random() - 0.5) * 0.1),
      };
      
      reports.push({
        id: `report_${userId}_${i}`,
        sessionId: `session_${userId}_${i}`,
        userId,
        overallScore: Math.round(sessionScore * 100) / 100,
        categoryScores,
        strengths: ['communication'],
        weaknesses: ['confidence'],
        improvementPlan: {
          priorityAreas: ['confidence'],
          recommendations: [],
          practiceExercises: [],
          estimatedTimeToImprove: 14
        },
        benchmarkComparison: {
          percentile: 60,
          averageScore: sessionScore,
          topPerformerScore: 0.9,
          industryAverage: 0.7,
          roleAverage: 0.72
        },
        transcript: {
          segments: [],
          highlights: [],
          summary: 'Mock transcript'
        },
        visualComponents: {
          scoreChart: { type: 'radar', data: [], colors: [], labels: [] },
          confidenceHeatmap: { timePoints: [], dimensions: { width: 800, height: 400 }, colorScale: { min: '#ffebee', max: '#c8e6c9', steps: 10 } },
          progressChart: { type: 'line', timeSeriesData: [], trendLine: { slope: 0.1, direction: 'improving', confidence: 0.8 } },
          categoryBreakdown: { type: 'donut', segments: [], totalScore: sessionScore }
        },
        createdAt: new Date()
      } as PerformanceReport);
    }
    
    return reports;
  }

  private getIndustryBenchmarks(industry: string): CategoryScores {
    const benchmarks: { [key: string]: CategoryScores } = {
      'Technology': {
        communication: 0.72,
        technicalAccuracy: 0.78,
        confidence: 0.68,
        clarity: 0.74,
        structure: 0.71,
        relevance: 0.76
      },
      'Finance': {
        communication: 0.75,
        technicalAccuracy: 0.73,
        confidence: 0.71,
        clarity: 0.77,
        structure: 0.74,
        relevance: 0.72
      },
      'Healthcare': {
        communication: 0.78,
        technicalAccuracy: 0.75,
        confidence: 0.73,
        clarity: 0.79,
        structure: 0.72,
        relevance: 0.74
      }
    };
    
    return benchmarks[industry] || benchmarks['Technology'];
  }

  private getRoleBenchmarks(role: string): CategoryScores {
    const benchmarks: { [key: string]: CategoryScores } = {
      'Software Engineer': {
        communication: 0.70,
        technicalAccuracy: 0.82,
        confidence: 0.66,
        clarity: 0.72,
        structure: 0.74,
        relevance: 0.78
      },
      'Product Manager': {
        communication: 0.80,
        technicalAccuracy: 0.68,
        confidence: 0.75,
        clarity: 0.78,
        structure: 0.76,
        relevance: 0.74
      },
      'Data Scientist': {
        communication: 0.68,
        technicalAccuracy: 0.85,
        confidence: 0.64,
        clarity: 0.70,
        structure: 0.72,
        relevance: 0.80
      }
    };
    
    return benchmarks[role] || benchmarks['Software Engineer'];
  }

  private getTopPerformerBenchmarks(): CategoryScores {
    return {
      communication: 0.92,
      technicalAccuracy: 0.94,
      confidence: 0.89,
      clarity: 0.91,
      structure: 0.90,
      relevance: 0.93
    };
  }

  private generateComparisonInsights(
    userScores: CategoryScores,
    industryAvg: CategoryScores,
    roleAvg: CategoryScores,
    percentile: number
  ): string[] {
    const insights: string[] = [];

    // Overall performance insight
    if (percentile >= 80) {
      insights.push('You\'re performing exceptionally well, ranking in the top 20% of candidates.');
    } else if (percentile >= 60) {
      insights.push('You\'re performing above average compared to your peers.');
    } else if (percentile >= 40) {
      insights.push('You\'re performing around average - there\'s room for improvement.');
    } else {
      insights.push('Focus on improvement - you\'re currently below average performance.');
    }

    // Category-specific insights
    Object.entries(userScores).forEach(([category, score]) => {
      const industryScore = industryAvg[category as keyof CategoryScores];
      const roleScore = roleAvg[category as keyof CategoryScores];
      
      if (score > Math.max(industryScore, roleScore) + 0.1) {
        insights.push(`Your ${category} skills are significantly above both industry and role averages.`);
      } else if (score < Math.min(industryScore, roleScore) - 0.1) {
        insights.push(`Your ${category} skills need improvement - currently below industry standards.`);
      }
    });

    return insights;
  }

  private getDefaultCategoryScores(): CategoryScores {
    return {
      communication: 0.5,
      technicalAccuracy: 0.5,
      confidence: 0.5,
      clarity: 0.5,
      structure: 0.5,
      relevance: 0.5
    };
  }

  private getDefaultProgressMetrics(): ProgressMetrics {
    return {
      overallImprovement: 0,
      categoryImprovements: this.getDefaultCategoryScores(),
      consistencyScore: 0,
      streakCount: 0,
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      recentTrend: 'stable'
    };
  }
}