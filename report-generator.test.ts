import { DefaultReportGeneratorService } from '../services/report-generator';
import { ResponseAnalysis, CategoryScores, InterviewSession, Question, UserResponse } from '@ai-interview/types';

describe('DefaultReportGeneratorService', () => {
  let reportGenerator: DefaultReportGeneratorService;

  beforeEach(() => {
    reportGenerator = new DefaultReportGeneratorService();
  });

  describe('calculateCategoryScores', () => {
    it('should calculate correct category scores from analyses', () => {
      const analyses: ResponseAnalysis[] = [
        {
          textAnalysis: {
            wordCount: 100,
            sentenceCount: 5,
            keywordRelevance: 0.8,
            structureScore: 0.7,
            clarityScore: 0.9,
            grammarScore: 0.85,
          },
          speechAnalysis: {
            pace: 150,
            pauseCount: 3,
            fillerWordCount: 2,
            clarityScore: 0.8,
            volumeConsistency: 0.9,
          },
          emotionAnalysis: {
            confidence: 0.7,
            nervousness: 0.3,
            enthusiasm: 0.8,
            stress: 0.2,
            engagement: 0.9,
          },
          confidenceScore: 0.75,
          overallScore: 0.8,
        },
        {
          textAnalysis: {
            wordCount: 120,
            sentenceCount: 6,
            keywordRelevance: 0.9,
            structureScore: 0.8,
            clarityScore: 0.85,
            grammarScore: 0.9,
          },
          speechAnalysis: {
            pace: 140,
            pauseCount: 2,
            fillerWordCount: 1,
            clarityScore: 0.9,
            volumeConsistency: 0.85,
          },
          emotionAnalysis: {
            confidence: 0.8,
            nervousness: 0.2,
            enthusiasm: 0.9,
            stress: 0.1,
            engagement: 0.95,
          },
          confidenceScore: 0.85,
          overallScore: 0.85,
        },
      ];

      const categoryScores = reportGenerator.calculateCategoryScores(analyses);

      expect(categoryScores.communication).toBe(0.85); // Average of speech clarity scores
      expect(categoryScores.technicalAccuracy).toBe(0.75); // Average of structure scores
      expect(categoryScores.confidence).toBe(0.8); // Average of confidence scores
      expect(categoryScores.clarity).toBe(0.88); // Average of text clarity scores
      expect(categoryScores.structure).toBe(0.75); // Average of structure scores
      expect(categoryScores.relevance).toBe(0.85); // Average of keyword relevance
    });

    it('should throw error when no analyses provided', () => {
      expect(() => {
        reportGenerator.calculateCategoryScores([]);
      }).toThrow('No analyses provided for category score calculation');
    });

    it('should handle single analysis correctly', () => {
      const analyses: ResponseAnalysis[] = [
        {
          textAnalysis: {
            wordCount: 100,
            sentenceCount: 5,
            keywordRelevance: 0.8,
            structureScore: 0.7,
            clarityScore: 0.9,
            grammarScore: 0.85,
          },
          speechAnalysis: {
            pace: 150,
            pauseCount: 3,
            fillerWordCount: 2,
            clarityScore: 0.8,
            volumeConsistency: 0.9,
          },
          emotionAnalysis: {
            confidence: 0.7,
            nervousness: 0.3,
            enthusiasm: 0.8,
            stress: 0.2,
            engagement: 0.9,
          },
          confidenceScore: 0.75,
          overallScore: 0.8,
        },
      ];

      const categoryScores = reportGenerator.calculateCategoryScores(analyses);

      expect(categoryScores.communication).toBe(0.8);
      expect(categoryScores.confidence).toBe(0.75);
      expect(categoryScores.clarity).toBe(0.9);
    });
  });

  describe('generateImprovementPlan', () => {
    it('should identify priority areas correctly', () => {
      const categoryScores: CategoryScores = {
        communication: 0.6, // Below threshold
        technicalAccuracy: 0.8, // Above threshold
        confidence: 0.5, // Below threshold
        clarity: 0.9, // Above threshold
        structure: 0.65, // Below threshold
        relevance: 0.75, // Above threshold
      };

      const analyses: ResponseAnalysis[] = []; // Empty for this test

      const improvementPlan = reportGenerator.generateImprovementPlan(categoryScores, analyses);

      expect(improvementPlan.priorityAreas).toContain('communication');
      expect(improvementPlan.priorityAreas).toContain('confidence');
      expect(improvementPlan.priorityAreas).toContain('structure');
      expect(improvementPlan.priorityAreas).not.toContain('technical accuracy');
      expect(improvementPlan.priorityAreas).not.toContain('clarity');
      expect(improvementPlan.priorityAreas).not.toContain('relevance');
    });

    it('should generate recommendations for priority areas', () => {
      const categoryScores: CategoryScores = {
        communication: 0.6,
        technicalAccuracy: 0.8,
        confidence: 0.5,
        clarity: 0.9,
        structure: 0.75,
        relevance: 0.75,
      };

      const analyses: ResponseAnalysis[] = [];

      const improvementPlan = reportGenerator.generateImprovementPlan(categoryScores, analyses);

      expect(improvementPlan.recommendations).toHaveLength(2); // communication and confidence
      expect(improvementPlan.recommendations.some(r => r.category === 'Communication')).toBe(true);
      expect(improvementPlan.recommendations.some(r => r.category === 'Confidence')).toBe(true);
    });

    it('should estimate improvement time based on priority areas', () => {
      const categoryScores: CategoryScores = {
        communication: 0.6,
        technicalAccuracy: 0.6,
        confidence: 0.6,
        clarity: 0.9,
        structure: 0.75,
        relevance: 0.75,
      };

      const analyses: ResponseAnalysis[] = [];

      const improvementPlan = reportGenerator.generateImprovementPlan(categoryScores, analyses);

      // 3 priority areas * 14 days = 42 days
      expect(improvementPlan.estimatedTimeToImprove).toBe(42);
    });

    it('should have minimum improvement time of 7 days', () => {
      const categoryScores: CategoryScores = {
        communication: 0.9,
        technicalAccuracy: 0.9,
        confidence: 0.9,
        clarity: 0.9,
        structure: 0.9,
        relevance: 0.9,
      };

      const analyses: ResponseAnalysis[] = [];

      const improvementPlan = reportGenerator.generateImprovementPlan(categoryScores, analyses);

      expect(improvementPlan.estimatedTimeToImprove).toBe(7);
    });
  });

  describe('createBenchmarkComparison', () => {
    it('should create benchmark comparison with correct percentile', async () => {
      const overallScore = 0.8;
      const categoryScores: CategoryScores = {
        communication: 0.8,
        technicalAccuracy: 0.8,
        confidence: 0.8,
        clarity: 0.8,
        structure: 0.8,
        relevance: 0.8,
      };

      const benchmarkComparison = await reportGenerator.createBenchmarkComparison(overallScore, categoryScores);

      expect(benchmarkComparison.averageScore).toBe(0.8);
      expect(benchmarkComparison.percentile).toBeGreaterThan(0);
      expect(benchmarkComparison.percentile).toBeLessThanOrEqual(95);
      expect(benchmarkComparison.industryAverage).toBe(0.72);
      expect(benchmarkComparison.roleAverage).toBe(0.75);
      expect(benchmarkComparison.topPerformerScore).toBe(0.92);
    });
  });

  describe('generateAnnotatedTranscript', () => {
    it('should generate transcript with segments and highlights', () => {
      const mockSession: InterviewSession = {
        id: 'session-1',
        userId: 'user-1',
        config: {
          industry: 'tech',
          role: 'software engineer',
          company: 'test company',
          difficulty: 'medium',
          questionTypes: ['technical'],
          timeLimit: 3600,
          interviewerPersonality: 'friendly',
        },
        status: 'completed',
        questions: [
          {
            id: 'q1',
            text: 'Tell me about yourself',
            type: 'behavioral',
            difficulty: 1,
            expectedDuration: 120,
          },
        ],
        responses: [
          {
            questionId: 'q1',
            textResponse: 'I am a software engineer with 5 years of experience.',
            timestamp: new Date(),
            duration: 90,
            analysis: {
              textAnalysis: {
                wordCount: 10,
                sentenceCount: 1,
                keywordRelevance: 0.8,
                structureScore: 0.7,
                clarityScore: 0.9,
                grammarScore: 0.85,
              },
              speechAnalysis: {
                pace: 150,
                pauseCount: 1,
                fillerWordCount: 0,
                clarityScore: 0.9,
                volumeConsistency: 0.9,
              },
              emotionAnalysis: {
                confidence: 0.8,
                nervousness: 0.2,
                enthusiasm: 0.7,
                stress: 0.1,
                engagement: 0.9,
              },
              confidenceScore: 0.8,
              overallScore: 0.85,
            },
          },
        ],
        startTime: new Date(),
        duration: 90,
        metadata: {},
      };

      const transcript = reportGenerator.generateAnnotatedTranscript(mockSession);

      expect(transcript.segments).toHaveLength(2); // Question + response
      expect(transcript.segments[0].speaker).toBe('interviewer');
      expect(transcript.segments[1].speaker).toBe('candidate');
      expect(transcript.highlights).toHaveLength(1); // Strong response
      expect(transcript.summary).toContain('1 questions answered');
    });
  });
});