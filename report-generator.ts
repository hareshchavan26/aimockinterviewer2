import {
  PerformanceReport,
  InterviewSession,
  ResponseAnalysis,
  CategoryScores,
  ImprovementPlan,
  BenchmarkComparison,
  AnnotatedTranscript,
  Recommendation,
  PracticeExercise,
  Resource,
  TranscriptSegment,
  TranscriptHighlight,
  VisualReportComponents,
  ScoreVisualization,
  ConfidenceHeatmap,
  ProgressVisualization,
  CategoryVisualization,
  ScoreDataPoint,
  HeatmapPoint,
  CategorySegment,
  UserResponse,
} from '@ai-interview/types';
import { logger } from '../utils/logger';
import { 
  DefaultImprovementRecommendationService,
  ImprovementRecommendationService,
  BetterAnswerSuggestion,
  PersonalizedDrill
} from './improvement-recommendation-service';
import { 
  DefaultAnswerSuggestionService,
  AnswerSuggestionService 
} from './answer-suggestion-service';
import { 
  DefaultPracticeDrillService,
  PracticeDrillService 
} from './practice-drill-service';

export interface ReportGeneratorService {
  generateReport(sessionId: string): Promise<PerformanceReport>;
  calculateCategoryScores(analyses: ResponseAnalysis[]): CategoryScores;
  generateImprovementPlan(categoryScores: CategoryScores, analyses: ResponseAnalysis[]): ImprovementPlan;
  generatePersonalizedImprovementPlan(categoryScores: CategoryScores, analyses: ResponseAnalysis[], session: InterviewSession): Promise<ImprovementPlan>;
  createBenchmarkComparison(overallScore: number, categoryScores: CategoryScores): Promise<BenchmarkComparison>;
  generateAnnotatedTranscript(session: InterviewSession): AnnotatedTranscript;
  generateVisualComponents(categoryScores: CategoryScores, analyses: ResponseAnalysis[], benchmarkComparison: BenchmarkComparison): VisualReportComponents;
  generateBetterAnswerSuggestions(session: InterviewSession, responses: UserResponse[], analyses: ResponseAnalysis[]): Promise<BetterAnswerSuggestion[]>;
  generatePersonalizedDrills(priorityAreas: string[], categoryScores: CategoryScores, session: InterviewSession, userHistory?: InterviewSession[]): Promise<PersonalizedDrill[]>;
}

export class DefaultReportGeneratorService implements ReportGeneratorService {
  private improvementService: ImprovementRecommendationService;
  private answerSuggestionService: AnswerSuggestionService;
  private practiceDrillService: PracticeDrillService;

  constructor(
    improvementService?: ImprovementRecommendationService,
    answerSuggestionService?: AnswerSuggestionService,
    practiceDrillService?: PracticeDrillService
  ) {
    this.improvementService = improvementService || new DefaultImprovementRecommendationService();
    this.answerSuggestionService = answerSuggestionService || new DefaultAnswerSuggestionService();
    this.practiceDrillService = practiceDrillService || new DefaultPracticeDrillService();
  }
  async generateReport(sessionId: string): Promise<PerformanceReport> {
    try {
      logger.info('Generating performance report', { sessionId });

      // Fetch session data (this would typically come from the interview service)
      const session = await this.fetchInterviewSession(sessionId);
      if (!session) {
        throw new Error(`Interview session not found: ${sessionId}`);
      }

      // Extract analyses from responses
      const analyses = session.responses
        .map(response => response.analysis)
        .filter((analysis): analysis is ResponseAnalysis => analysis !== undefined);

      if (analyses.length === 0) {
        throw new Error(`No analysis data found for session: ${sessionId}`);
      }

      // Calculate overall score
      const overallScore = this.calculateOverallScore(analyses);

      // Calculate category scores
      const categoryScores = this.calculateCategoryScores(analyses);

      // Generate improvement plan using the enhanced service
      const improvementPlan = await this.generatePersonalizedImprovementPlan(
        categoryScores, 
        analyses, 
        session
      );

      // Create benchmark comparison
      const benchmarkComparison = await this.createBenchmarkComparison(overallScore, categoryScores);

      // Generate annotated transcript
      const transcript = this.generateAnnotatedTranscript(session);

      // Generate visual components
      const visualComponents = this.generateVisualComponents(categoryScores, analyses, benchmarkComparison);

      // Identify strengths and weaknesses
      const { strengths, weaknesses } = this.identifyStrengthsAndWeaknesses(categoryScores);

      const report: PerformanceReport = {
        id: this.generateReportId(),
        sessionId,
        userId: session.userId,
        overallScore,
        categoryScores,
        strengths,
        weaknesses,
        improvementPlan,
        benchmarkComparison,
        transcript,
        visualComponents,
        createdAt: new Date(),
      };

      logger.info('Performance report generated successfully', { 
        sessionId, 
        reportId: report.id,
        overallScore 
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate performance report', { sessionId, error });
      throw error;
    }
  }

  calculateCategoryScores(analyses: ResponseAnalysis[]): CategoryScores {
    if (analyses.length === 0) {
      throw new Error('No analyses provided for category score calculation');
    }

    // Calculate averages for each category with NaN/Infinity protection
    const communication = this.calculateAverage(analyses.map(a => a.speechAnalysis.clarityScore));
    const technicalAccuracy = this.calculateAverage(analyses.map(a => a.textAnalysis.structureScore));
    const confidence = this.calculateAverage(analyses.map(a => a.confidenceScore));
    const clarity = this.calculateAverage(analyses.map(a => a.textAnalysis.clarityScore));
    const structure = this.calculateAverage(analyses.map(a => a.textAnalysis.structureScore));
    const relevance = this.calculateAverage(analyses.map(a => a.textAnalysis.keywordRelevance));

    // Ensure all scores are valid numbers between 0 and 1
    const sanitizeScore = (score: number): number => {
      if (!Number.isFinite(score) || Number.isNaN(score)) return 0;
      return Math.max(0, Math.min(1, score));
    };

    return {
      communication: Math.round(sanitizeScore(communication) * 100) / 100,
      technicalAccuracy: Math.round(sanitizeScore(technicalAccuracy) * 100) / 100,
      confidence: Math.round(sanitizeScore(confidence) * 100) / 100,
      clarity: Math.round(sanitizeScore(clarity) * 100) / 100,
      structure: Math.round(sanitizeScore(structure) * 100) / 100,
      relevance: Math.round(sanitizeScore(relevance) * 100) / 100,
    };
  }

  generateImprovementPlan(categoryScores: CategoryScores, analyses: ResponseAnalysis[]): ImprovementPlan {
    // This method is kept for backward compatibility
    // The actual implementation now uses the dedicated improvement service
    logger.warn('Using deprecated generateImprovementPlan method. Use generatePersonalizedPlan instead.');
    
    // Fallback to basic implementation
    const priorityAreas: string[] = [];
    const scoreThreshold = 0.7;

    if (categoryScores.communication < scoreThreshold) priorityAreas.push('communication');
    if (categoryScores.technicalAccuracy < scoreThreshold) priorityAreas.push('technical accuracy');
    if (categoryScores.confidence < scoreThreshold) priorityAreas.push('confidence');
    if (categoryScores.clarity < scoreThreshold) priorityAreas.push('clarity');
    if (categoryScores.structure < scoreThreshold) priorityAreas.push('structure');
    if (categoryScores.relevance < scoreThreshold) priorityAreas.push('relevance');

    const recommendations = this.generateRecommendations(priorityAreas, categoryScores);
    const practiceExercises = this.generatePracticeExercises(priorityAreas);
    const estimatedTimeToImprove = Math.max(7, priorityAreas.length * 14);

    return {
      priorityAreas,
      recommendations,
      practiceExercises,
      estimatedTimeToImprove,
    };
  }

  async generatePersonalizedImprovementPlan(
    categoryScores: CategoryScores, 
    analyses: ResponseAnalysis[], 
    session: InterviewSession
  ): Promise<ImprovementPlan> {
    return await this.improvementService.generatePersonalizedPlan(
      categoryScores,
      analyses,
      session
    );
  }

  async createBenchmarkComparison(overallScore: number, categoryScores: CategoryScores): Promise<BenchmarkComparison> {
    // In a real implementation, this would fetch actual benchmark data from the database
    // For now, we'll use simulated benchmark data
    const industryAverage = 0.72;
    const roleAverage = 0.75;
    const topPerformerScore = 0.92;

    // Calculate percentile based on overall score
    const percentile = this.calculatePercentile(overallScore, industryAverage);

    return {
      percentile,
      averageScore: overallScore,
      topPerformerScore,
      industryAverage,
      roleAverage,
    };
  }

  generateAnnotatedTranscript(session: InterviewSession): AnnotatedTranscript {
    const segments: TranscriptSegment[] = [];
    const highlights: TranscriptHighlight[] = [];

    // Generate transcript segments from responses
    session.responses.forEach((response, index) => {
      const question = session.questions[index];
      
      // Add interviewer question
      segments.push({
        startTime: index * 120, // Assume 2 minutes per question
        endTime: index * 120 + 30, // 30 seconds for question
        text: question?.text || 'Question not available',
        speaker: 'interviewer',
        confidence: 1.0,
      });

      // Add candidate response
      if (response.textResponse) {
        segments.push({
          startTime: index * 120 + 30,
          endTime: (index + 1) * 120,
          text: response.textResponse,
          speaker: 'candidate',
          confidence: response.analysis?.confidenceScore || 0.5,
        });

        // Add highlights based on analysis
        if (response.analysis) {
          const highlight = this.createHighlightFromAnalysis(
            index * 120 + 30,
            (index + 1) * 120,
            response.analysis
          );
          if (highlight) {
            highlights.push(highlight);
          }
        }
      }
    });

    // Generate summary
    const summary = this.generateTranscriptSummary(session, segments);

    return {
      segments,
      highlights,
      summary,
    };
  }

  private async fetchInterviewSession(sessionId: string): Promise<InterviewSession | null> {
    // In a real implementation, this would fetch from the interview service
    // For now, we'll return null to indicate the session should be passed in
    logger.warn('fetchInterviewSession not implemented - session data should be provided');
    return null;
  }

  private calculateOverallScore(analyses: ResponseAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    const totalScore = analyses.reduce((sum, analysis) => sum + analysis.overallScore, 0);
    return Math.round((totalScore / analyses.length) * 100) / 100;
  }

  private calculateAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    const validScores = scores.filter(score => Number.isFinite(score) && !Number.isNaN(score));
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }

  private identifyStrengthsAndWeaknesses(categoryScores: CategoryScores): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const strongThreshold = 0.8;
    const weakThreshold = 0.6;

    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score >= strongThreshold) {
        strengths.push(this.formatCategoryName(category));
      } else if (score <= weakThreshold) {
        weaknesses.push(this.formatCategoryName(category));
      }
    });

    return { strengths, weaknesses };
  }

  private generateRecommendations(priorityAreas: string[], categoryScores: CategoryScores): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // If no priority areas, provide general recommendations
    if (priorityAreas.length === 0) {
      recommendations.push({
        category: 'General Improvement',
        description: 'Continue practicing to maintain and improve your interview skills',
        actionItems: [
          'Practice mock interviews regularly',
          'Stay updated with industry trends',
          'Work on communication skills',
          'Prepare for common interview questions'
        ],
        resources: [
          {
            title: 'Interview Best Practices',
            url: 'https://example.com/interview-best-practices',
            type: 'article'
          }
        ]
      });
      return recommendations;
    }

    priorityAreas.forEach(area => {
      switch (area) {
        case 'communication':
          recommendations.push({
            category: 'Communication',
            description: 'Improve your verbal communication skills and speaking clarity',
            actionItems: [
              'Practice speaking slowly and clearly',
              'Record yourself answering questions and review for clarity',
              'Work on reducing filler words (um, uh, like)',
              'Practice maintaining consistent volume and pace'
            ],
            resources: [
              {
                title: 'Effective Communication Skills',
                url: 'https://example.com/communication-skills',
                type: 'course'
              }
            ]
          });
          break;
        case 'technical accuracy':
          recommendations.push({
            category: 'Technical Accuracy',
            description: 'Strengthen your technical knowledge and problem-solving approach',
            actionItems: [
              'Review fundamental concepts in your field',
              'Practice explaining technical concepts clearly',
              'Work through coding problems or case studies',
              'Stay updated with industry best practices'
            ],
            resources: [
              {
                title: 'Technical Interview Preparation',
                url: 'https://example.com/technical-prep',
                type: 'course'
              }
            ]
          });
          break;
        case 'confidence':
          recommendations.push({
            category: 'Confidence',
            description: 'Build confidence in your interview responses and presentation',
            actionItems: [
              'Practice mock interviews regularly',
              'Prepare and rehearse common interview questions',
              'Work on positive self-talk and mindset',
              'Focus on your achievements and strengths'
            ],
            resources: [
              {
                title: 'Building Interview Confidence',
                url: 'https://example.com/confidence-building',
                type: 'article'
              }
            ]
          });
          break;
        case 'clarity':
          recommendations.push({
            category: 'Clarity',
            description: 'Improve the clarity and coherence of your responses',
            actionItems: [
              'Structure your answers using frameworks like STAR method',
              'Practice articulating thoughts clearly before speaking',
              'Use specific examples to illustrate your points',
              'Avoid jargon and explain concepts simply'
            ],
            resources: [
              {
                title: 'Clear Communication Techniques',
                url: 'https://example.com/clarity-techniques',
                type: 'article'
              }
            ]
          });
          break;
        case 'structure':
          recommendations.push({
            category: 'Structure',
            description: 'Improve the organization and flow of your responses',
            actionItems: [
              'Use structured frameworks for answering questions',
              'Practice organizing thoughts before speaking',
              'Create logical flow from introduction to conclusion',
              'Use transition words to connect ideas'
            ],
            resources: [
              {
                title: 'Structured Interview Responses',
                url: 'https://example.com/structured-responses',
                type: 'article'
              }
            ]
          });
          break;
        case 'relevance':
          recommendations.push({
            category: 'Relevance',
            description: 'Ensure your responses directly address the questions asked',
            actionItems: [
              'Listen carefully to the full question before answering',
              'Ask clarifying questions if needed',
              'Stay focused on the specific topic being discussed',
              'Provide examples that directly relate to the question'
            ],
            resources: [
              {
                title: 'Staying On Topic in Interviews',
                url: 'https://example.com/relevance-tips',
                type: 'article'
              }
            ]
          });
          break;
        default:
          recommendations.push({
            category: this.formatCategoryName(area),
            description: `Improve your ${area} skills`,
            actionItems: [`Practice ${area}-related exercises`],
            resources: []
          });
      }
    });

    return recommendations;
  }

  private generatePracticeExercises(priorityAreas: string[]): PracticeExercise[] {
    const exercises: PracticeExercise[] = [];

    priorityAreas.forEach(area => {
      switch (area) {
        case 'communication':
          exercises.push({
            title: 'Elevator Pitch Practice',
            description: 'Practice delivering a clear, concise 60-second introduction about yourself',
            difficulty: 'easy',
            estimatedDuration: 15,
            category: 'Communication'
          });
          break;
        case 'technical accuracy':
          exercises.push({
            title: 'Technical Concept Explanation',
            description: 'Explain a complex technical concept to a non-technical audience',
            difficulty: 'medium',
            estimatedDuration: 30,
            category: 'Technical Accuracy'
          });
          break;
        case 'confidence':
          exercises.push({
            title: 'Power Posing and Visualization',
            description: 'Practice confident body language and visualize successful interview scenarios',
            difficulty: 'easy',
            estimatedDuration: 10,
            category: 'Confidence'
          });
          break;
        case 'clarity':
          exercises.push({
            title: 'STAR Method Practice',
            description: 'Practice structuring responses using Situation, Task, Action, Result framework',
            difficulty: 'medium',
            estimatedDuration: 20,
            category: 'Clarity'
          });
          break;
        case 'structure':
          exercises.push({
            title: 'Response Organization Drill',
            description: 'Practice organizing thoughts and creating logical flow in answers',
            difficulty: 'medium',
            estimatedDuration: 25,
            category: 'Structure'
          });
          break;
        case 'relevance':
          exercises.push({
            title: 'Question Analysis Practice',
            description: 'Practice identifying key elements in questions and staying on topic',
            difficulty: 'easy',
            estimatedDuration: 15,
            category: 'Relevance'
          });
          break;
        default:
          exercises.push({
            title: `${this.formatCategoryName(area)} Practice`,
            description: `Practice exercises to improve your ${area} skills`,
            difficulty: 'medium',
            estimatedDuration: 20,
            category: this.formatCategoryName(area)
          });
      }
    });

    return exercises;
  }

  private calculatePercentile(score: number, average: number): number {
    // Simplified percentile calculation
    // In reality, this would use actual distribution data
    const percentile = Math.min(95, Math.max(5, (score / average) * 50));
    return Math.round(percentile);
  }

  private createHighlightFromAnalysis(
    startTime: number,
    endTime: number,
    analysis: ResponseAnalysis
  ): TranscriptHighlight | null {
    // Enhanced color-coding based on multiple analysis factors
    const highlights: TranscriptHighlight[] = [];

    // Overall performance highlighting
    if (analysis.overallScore >= 0.8) {
      highlights.push({
        startTime,
        endTime,
        type: 'strength',
        description: 'Excellent response with strong overall performance',
        color: '#4CAF50' // Green
      });
    } else if (analysis.overallScore <= 0.4) {
      highlights.push({
        startTime,
        endTime,
        type: 'weakness',
        description: 'Response needs significant improvement',
        color: '#F44336' // Red
      });
    }

    // Confidence-specific highlighting
    if (analysis.confidenceScore <= 0.5) {
      highlights.push({
        startTime,
        endTime,
        type: 'improvement',
        description: 'Low confidence detected - practice speaking with more assurance',
        color: '#FF9800' // Orange
      });
    } else if (analysis.confidenceScore >= 0.9) {
      highlights.push({
        startTime,
        endTime,
        type: 'strength',
        description: 'Excellent confidence and self-assurance',
        color: '#2196F3' // Blue
      });
    }

    // Technical accuracy highlighting
    if (analysis.textAnalysis.structureScore <= 0.4) {
      highlights.push({
        startTime,
        endTime,
        type: 'improvement',
        description: 'Improve response structure and organization',
        color: '#9C27B0' // Purple
      });
    }

    // Clarity highlighting
    if (analysis.textAnalysis.clarityScore <= 0.4) {
      highlights.push({
        startTime,
        endTime,
        type: 'improvement',
        description: 'Response lacks clarity - be more specific and direct',
        color: '#FF5722' // Deep Orange
      });
    }

    // Speech quality highlighting
    if (analysis.speechAnalysis.clarityScore <= 0.4) {
      highlights.push({
        startTime,
        endTime,
        type: 'improvement',
        description: 'Speech clarity needs improvement - speak slower and more clearly',
        color: '#795548' // Brown
      });
    }

    // Filler words highlighting
    if (analysis.speechAnalysis.fillerWordCount > 5) {
      highlights.push({
        startTime,
        endTime,
        type: 'improvement',
        description: `Reduce filler words (detected ${analysis.speechAnalysis.fillerWordCount})`,
        color: '#607D8B' // Blue Grey
      });
    }

    // Return the most important highlight (prioritize weaknesses for improvement)
    const weaknessHighlights = highlights.filter(h => h.type === 'weakness');
    const improvementHighlights = highlights.filter(h => h.type === 'improvement');
    const strengthHighlights = highlights.filter(h => h.type === 'strength');

    if (weaknessHighlights.length > 0) {
      return weaknessHighlights[0];
    } else if (improvementHighlights.length > 0) {
      return improvementHighlights[0];
    } else if (strengthHighlights.length > 0) {
      return strengthHighlights[0];
    }

    return null;
  }

  private generateTranscriptSummary(session: InterviewSession, segments: TranscriptSegment[]): string {
    const candidateSegments = segments.filter(s => s.speaker === 'candidate');
    const avgConfidence = candidateSegments.reduce((sum, s) => sum + s.confidence, 0) / candidateSegments.length;
    
    return `Interview session completed with ${session.responses.length} questions answered. ` +
           `Average response confidence: ${Math.round(avgConfidence * 100)}%. ` +
           `Total duration: ${Math.round(session.duration / 60)} minutes.`;
  }

  generateVisualComponents(categoryScores: CategoryScores, analyses: ResponseAnalysis[], benchmarkComparison: BenchmarkComparison): VisualReportComponents {
    return {
      scoreChart: this.generateScoreVisualization(categoryScores, benchmarkComparison),
      confidenceHeatmap: this.generateConfidenceHeatmap(analyses),
      progressChart: this.generateProgressVisualization(categoryScores),
      categoryBreakdown: this.generateCategoryVisualization(categoryScores),
    };
  }

  private generateScoreVisualization(categoryScores: CategoryScores, benchmarkComparison: BenchmarkComparison): ScoreVisualization {
    const categories = Object.keys(categoryScores) as (keyof CategoryScores)[];
    const colors = [
      '#4CAF50', // Green for communication
      '#2196F3', // Blue for technical accuracy
      '#FF9800', // Orange for confidence
      '#9C27B0', // Purple for clarity
      '#F44336', // Red for structure
      '#607D8B', // Blue grey for relevance
    ];

    const data: ScoreDataPoint[] = categories.map((category, index) => ({
      category: this.formatCategoryName(category),
      score: categoryScores[category],
      benchmark: benchmarkComparison.industryAverage,
      color: colors[index] || '#757575',
    }));

    return {
      type: 'radar',
      data,
      colors,
      labels: data.map(d => d.category),
    };
  }

  private generateConfidenceHeatmap(analyses: ResponseAnalysis[]): ConfidenceHeatmap {
    const timePoints: HeatmapPoint[] = [];
    const totalDuration = analyses.length * 120; // Assume 2 minutes per response
    
    analyses.forEach((analysis, index) => {
      const timestamp = index * 120;
      const confidence = analysis.confidenceScore || 0;
      const contentQuality = (analysis.textAnalysis.clarityScore + analysis.textAnalysis.structureScore) / 2;
      
      // Create multiple points for smoother heatmap
      for (let i = 0; i < 10; i++) {
        const timeOffset = (i / 10) * 120;
        timePoints.push({
          timestamp: timestamp + timeOffset,
          confidence: confidence + (Math.random() - 0.5) * 0.1, // Add slight variation
          contentQuality: contentQuality + (Math.random() - 0.5) * 0.1,
          intensity: Math.min(confidence + contentQuality, 1),
          coordinates: {
            x: (timestamp + timeOffset) / totalDuration,
            y: confidence,
          },
        });
      }
    });

    return {
      timePoints,
      dimensions: {
        width: 800,
        height: 400,
      },
      colorScale: {
        min: '#ffebee', // Light red
        max: '#c8e6c9', // Light green
        steps: 10,
      },
    };
  }

  private generateProgressVisualization(categoryScores: CategoryScores): ProgressVisualization {
    // For now, generate mock historical data
    // In a real implementation, this would fetch historical session data
    const mockHistoricalData = this.generateMockProgressData(categoryScores);

    const trendSlope = this.calculateTrendSlope(mockHistoricalData);
    
    return {
      type: 'line',
      timeSeriesData: mockHistoricalData,
      trendLine: {
        slope: trendSlope,
        direction: trendSlope > 0.01 ? 'improving' : trendSlope < -0.01 ? 'declining' : 'stable',
        confidence: 0.85,
      },
    };
  }

  private generateCategoryVisualization(categoryScores: CategoryScores): CategoryVisualization {
    const totalScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    const categories = Object.keys(categoryScores) as (keyof CategoryScores)[];
    const colors = [
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#607D8B'
    ];

    const segments: CategorySegment[] = categories.map((category, index) => {
      const score = categoryScores[category];
      return {
        category: this.formatCategoryName(category),
        score,
        percentage: (score / totalScore) * 100,
        color: colors[index] || '#757575',
        description: this.getCategoryDescription(category),
      };
    });

    return {
      type: 'donut',
      segments,
      totalScore,
    };
  }

  private generateMockProgressData(currentScores: CategoryScores): any[] {
    // Generate 5 mock historical sessions showing improvement over time
    const sessions = [];
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - 2); // Start 2 months ago

    for (let i = 0; i < 5; i++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(sessionDate.getDate() + i * 14); // Every 2 weeks

      // Simulate gradual improvement
      const improvementFactor = 0.7 + (i * 0.075); // Start at 70%, improve by 7.5% each session
      
      const historicalScores: CategoryScores = {
        communication: Math.min(currentScores.communication * improvementFactor, 1),
        technicalAccuracy: Math.min(currentScores.technicalAccuracy * improvementFactor, 1),
        confidence: Math.min(currentScores.confidence * improvementFactor, 1),
        clarity: Math.min(currentScores.clarity * improvementFactor, 1),
        structure: Math.min(currentScores.structure * improvementFactor, 1),
        relevance: Math.min(currentScores.relevance * improvementFactor, 1),
      };

      const overallScore = Object.values(historicalScores).reduce((sum, score) => sum + score, 0) / 6;

      sessions.push({
        timestamp: sessionDate.getTime(),
        overallScore: Math.round(overallScore * 100) / 100,
        categoryScores: historicalScores,
        sessionId: `session_${i + 1}`,
      });
    }

    return sessions;
  }

  private calculateTrendSlope(data: any[]): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((sum, _, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.overallScore, 0);
    const sumXY = data.reduce((sum, point, index) => sum + (index * point.overallScore), 0);
    const sumXX = data.reduce((sum, _, index) => sum + (index * index), 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private getCategoryDescription(category: keyof CategoryScores): string {
    const descriptions = {
      communication: 'Verbal communication skills and speaking clarity',
      technicalAccuracy: 'Technical knowledge and problem-solving accuracy',
      confidence: 'Self-assurance and presentation confidence',
      clarity: 'Clarity of thought and expression',
      structure: 'Organization and logical flow of responses',
      relevance: 'Relevance and appropriateness of answers',
    };
    
    return descriptions[category] || 'Performance in this category';
  }

  private formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
  }

  async generateBetterAnswerSuggestions(
    session: InterviewSession,
    responses: UserResponse[],
    analyses: ResponseAnalysis[]
  ): Promise<BetterAnswerSuggestion[]> {
    return await this.answerSuggestionService.generateBetterAnswerSuggestions(
      session,
      responses,
      analyses
    );
  }

  async generatePersonalizedDrills(
    priorityAreas: string[],
    categoryScores: CategoryScores,
    session: InterviewSession,
    userHistory?: InterviewSession[]
  ): Promise<PersonalizedDrill[]> {
    return await this.practiceDrillService.generatePersonalizedDrills(
      priorityAreas,
      categoryScores,
      session,
      userHistory
    );
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}