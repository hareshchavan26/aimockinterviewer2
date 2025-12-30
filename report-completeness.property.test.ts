import * as fc from 'fast-check';
import { DefaultReportGeneratorService } from '../services/report-generator';
import { 
  InterviewSession, 
  ResponseAnalysis, 
  UserResponse, 
  Question,
  PerformanceReport,
  CategoryScores,
  TranscriptHighlight
} from '@ai-interview/types';

/**
 * Property-Based Test for Report Completeness
 * 
 * Feature: ai-mock-interview-platform, Property 11: Performance Report Completeness
 * 
 * Property: For any completed interview session, the generated report should include 
 * all analyzed components and provide comprehensive feedback.
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.7
 */

describe('Property 11: Performance Report Completeness', () => {
  let reportGenerator: DefaultReportGeneratorService;

  beforeEach(() => {
    reportGenerator = new DefaultReportGeneratorService();
  });

  // Generators for property-based testing
  const analysisGenerator = fc.record({
    textAnalysis: fc.record({
      wordCount: fc.integer({ min: 1, max: 500 }),
      sentenceCount: fc.integer({ min: 1, max: 50 }),
      keywordRelevance: fc.float({ min: 0, max: 1 }),
      structureScore: fc.float({ min: 0, max: 1 }),
      clarityScore: fc.float({ min: 0, max: 1 }),
      grammarScore: fc.float({ min: 0, max: 1 }),
    }),
    speechAnalysis: fc.record({
      pace: fc.integer({ min: 80, max: 300 }),
      pauseCount: fc.integer({ min: 0, max: 20 }),
      fillerWordCount: fc.integer({ min: 0, max: 50 }),
      clarityScore: fc.float({ min: 0, max: 1 }),
      volumeConsistency: fc.float({ min: 0, max: 1 }),
    }),
    emotionAnalysis: fc.record({
      confidence: fc.float({ min: 0, max: 1 }),
      nervousness: fc.float({ min: 0, max: 1 }),
      enthusiasm: fc.float({ min: 0, max: 1 }),
      stress: fc.float({ min: 0, max: 1 }),
      engagement: fc.float({ min: 0, max: 1 }),
    }),
    confidenceScore: fc.float({ min: 0, max: 1 }),
    overallScore: fc.float({ min: 0, max: 1 }),
  });

  const questionGenerator = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    text: fc.string({ minLength: 10, maxLength: 200 }),
    type: fc.constantFrom('behavioral', 'technical', 'case_study', 'situational'),
    difficulty: fc.integer({ min: 1, max: 5 }),
    expectedDuration: fc.integer({ min: 30, max: 600 }),
  });

  const responseGenerator = (questionId: string) => fc.record({
    questionId: fc.constant(questionId),
    textResponse: fc.string({ minLength: 10, maxLength: 1000 }),
    timestamp: fc.date(),
    duration: fc.integer({ min: 10, max: 600 }),
    analysis: analysisGenerator,
  });

  const sessionGenerator = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    userId: fc.string({ minLength: 1, maxLength: 50 }),
    config: fc.record({
      industry: fc.string({ minLength: 1, maxLength: 50 }),
      role: fc.string({ minLength: 1, maxLength: 50 }),
      company: fc.string({ minLength: 1, maxLength: 100 }),
      difficulty: fc.constantFrom('easy', 'medium', 'hard'),
      questionTypes: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
      timeLimit: fc.integer({ min: 300, max: 7200 }),
      interviewerPersonality: fc.constantFrom('friendly', 'neutral', 'stress'),
    }),
    status: fc.constant('completed' as const),
    startTime: fc.date(),
    duration: fc.integer({ min: 300, max: 7200 }),
    metadata: fc.record({}),
  }).chain(baseSession => {
    // Generate questions and responses that match
    return fc.array(questionGenerator, { minLength: 1, maxLength: 10 })
      .chain(questions => {
        const responses = questions.map(q => responseGenerator(q.id));
        return fc.tuple(...responses).map(responseArray => ({
          ...baseSession,
          questions,
          responses: responseArray,
        }));
      });
  });

  /**
   * Property Test: Report Completeness
   * 
   * Tests that for any completed interview session with analysis data,
   * the generated report includes all required components and comprehensive feedback.
   */
  it('should generate complete reports with all analyzed components for any interview session', () => {
    fc.assert(
      fc.property(sessionGenerator, (session: InterviewSession) => {
        // Generate category scores from the session responses
        const analyses = session.responses
          .map(r => r.analysis)
          .filter((analysis): analysis is ResponseAnalysis => analysis !== undefined);

        // Skip if no analyses (edge case)
        if (analyses.length === 0) {
          return true;
        }

        // Calculate category scores
        const categoryScores = reportGenerator.calculateCategoryScores(analyses);

        // Generate improvement plan
        const improvementPlan = reportGenerator.generateImprovementPlan(categoryScores, analyses);

        // Generate annotated transcript
        const transcript = reportGenerator.generateAnnotatedTranscript(session);

        // Requirement 6.1: Comprehensive performance scoring
        expect(categoryScores).toBeDefined();
        expect(typeof categoryScores.communication).toBe('number');
        expect(typeof categoryScores.technicalAccuracy).toBe('number');
        expect(typeof categoryScores.confidence).toBe('number');
        expect(typeof categoryScores.clarity).toBe('number');
        expect(typeof categoryScores.structure).toBe('number');
        expect(typeof categoryScores.relevance).toBe('number');

        // All scores should be between 0 and 1
        Object.values(categoryScores).forEach(score => {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        });

        // Requirement 6.2: Visual representations with color-coding
        // Verified through transcript highlights having colors
        expect(transcript.highlights).toBeDefined();
        transcript.highlights.forEach((highlight: TranscriptHighlight) => {
          expect(highlight.color).toBeDefined();
          expect(typeof highlight.color).toBe('string');
          expect(highlight.color.length).toBeGreaterThan(0);
          expect(['strength', 'weakness', 'improvement']).toContain(highlight.type);
        });

        // Requirement 6.3: Highlighted transcripts with areas for improvement
        expect(transcript.segments).toBeDefined();
        expect(transcript.segments.length).toBeGreaterThan(0);
        expect(transcript.summary).toBeDefined();
        expect(typeof transcript.summary).toBe('string');
        expect(transcript.summary.length).toBeGreaterThan(0);

        // Requirement 6.7: Reports include all analyzed components and metrics
        // Verify improvement plan completeness
        expect(improvementPlan.priorityAreas).toBeDefined();
        expect(Array.isArray(improvementPlan.priorityAreas)).toBe(true);
        expect(improvementPlan.recommendations).toBeDefined();
        expect(Array.isArray(improvementPlan.recommendations)).toBe(true);
        expect(improvementPlan.practiceExercises).toBeDefined();
        expect(Array.isArray(improvementPlan.practiceExercises)).toBe(true);
        expect(typeof improvementPlan.estimatedTimeToImprove).toBe('number');
        expect(improvementPlan.estimatedTimeToImprove).toBeGreaterThan(0);

        // Verify all recommendations have required fields
        improvementPlan.recommendations.forEach(rec => {
          expect(rec.category).toBeDefined();
          expect(typeof rec.category).toBe('string');
          expect(rec.description).toBeDefined();
          expect(typeof rec.description).toBe('string');
          expect(Array.isArray(rec.actionItems)).toBe(true);
          expect(Array.isArray(rec.resources)).toBe(true);
        });

        // Verify all practice exercises have required fields
        improvementPlan.practiceExercises.forEach(exercise => {
          expect(exercise.title).toBeDefined();
          expect(typeof exercise.title).toBe('string');
          expect(exercise.description).toBeDefined();
          expect(typeof exercise.description).toBe('string');
          expect(['easy', 'medium', 'hard']).toContain(exercise.difficulty);
          expect(typeof exercise.estimatedDuration).toBe('number');
          expect(exercise.estimatedDuration).toBeGreaterThan(0);
          expect(exercise.category).toBeDefined();
          expect(typeof exercise.category).toBe('string');
        });

        return true;
      }),
      { 
        numRuns: 100,
        verbose: true,
        seed: 42, // For reproducible tests
      }
    );
  });

  /**
   * Property Test: Category Score Consistency
   * 
   * Tests that category scores are consistently calculated and all components
   * are properly included in the scoring.
   */
  it('should calculate consistent category scores that reflect all analysis components', () => {
    fc.assert(
      fc.property(
        fc.array(analysisGenerator, { minLength: 1, maxLength: 20 }),
        (analyses: ResponseAnalysis[]) => {
          const categoryScores = reportGenerator.calculateCategoryScores(analyses);

          // Requirement 6.1: Comprehensive performance scoring
          // Verify all category scores are present and valid
          const requiredCategories = [
            'communication',
            'technicalAccuracy', 
            'confidence',
            'clarity',
            'structure',
            'relevance'
          ] as const;

          requiredCategories.forEach(category => {
            expect(categoryScores[category]).toBeDefined();
            expect(typeof categoryScores[category]).toBe('number');
            expect(categoryScores[category]).toBeGreaterThanOrEqual(0);
            expect(categoryScores[category]).toBeLessThanOrEqual(1);
            expect(Number.isFinite(categoryScores[category])).toBe(true);
          });

          // Verify scores are reasonable averages of input data
          const avgCommunication = analyses.reduce((sum, a) => sum + (Number.isFinite(a.speechAnalysis.clarityScore) ? a.speechAnalysis.clarityScore : 0), 0) / analyses.length;
          const avgConfidence = analyses.reduce((sum, a) => sum + (Number.isFinite(a.confidenceScore) ? a.confidenceScore : 0), 0) / analyses.length;
          const avgClarity = analyses.reduce((sum, a) => sum + (Number.isFinite(a.textAnalysis.clarityScore) ? a.textAnalysis.clarityScore : 0), 0) / analyses.length;

          // Allow for rounding differences, but handle NaN cases
          if (Number.isFinite(avgCommunication) && Number.isFinite(categoryScores.communication)) {
            expect(Math.abs(categoryScores.communication - avgCommunication)).toBeLessThan(0.02);
          }
          if (Number.isFinite(avgConfidence) && Number.isFinite(categoryScores.confidence)) {
            expect(Math.abs(categoryScores.confidence - avgConfidence)).toBeLessThan(0.02);
          }
          if (Number.isFinite(avgClarity) && Number.isFinite(categoryScores.clarity)) {
            expect(Math.abs(categoryScores.clarity - avgClarity)).toBeLessThan(0.02);
          }

          return true;
        }
      ),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  });

  /**
   * Property Test: Improvement Plan Completeness
   * 
   * Tests that improvement plans are comprehensive and include all necessary
   * components for actionable feedback.
   */
  it('should generate comprehensive improvement plans with actionable recommendations', () => {
    fc.assert(
      fc.property(
        fc.record({
          communication: fc.float({ min: 0, max: 1 }),
          technicalAccuracy: fc.float({ min: 0, max: 1 }),
          confidence: fc.float({ min: 0, max: 1 }),
          clarity: fc.float({ min: 0, max: 1 }),
          structure: fc.float({ min: 0, max: 1 }),
          relevance: fc.float({ min: 0, max: 1 }),
        }),
        fc.array(analysisGenerator, { minLength: 1, maxLength: 10 }), // Ensure at least 1 analysis
        (categoryScores: CategoryScores, analyses: ResponseAnalysis[]) => {
          // No need to skip - we now guarantee at least 1 analysis

          const improvementPlan = reportGenerator.generateImprovementPlan(categoryScores, analyses);

          // Requirement 6.7: Reports include all analyzed components and metrics
          expect(improvementPlan).toBeDefined();
          expect(Array.isArray(improvementPlan.priorityAreas)).toBe(true);
          expect(Array.isArray(improvementPlan.recommendations)).toBe(true);
          expect(Array.isArray(improvementPlan.practiceExercises)).toBe(true);
          expect(typeof improvementPlan.estimatedTimeToImprove).toBe('number');

          // Priority areas should correspond to low scores (< 0.7)
          const lowScoreCategories = Object.entries(categoryScores)
            .filter(([_, score]) => score < 0.7)
            .map(([category, _]) => category);

          // Each low-scoring category should be represented in priority areas or recommendations
          // Since we have analysis data, we can meaningfully test improvement plan generation
          if (lowScoreCategories.length > 0) {
            lowScoreCategories.forEach(category => {
              // Create more flexible category matching
              const categoryVariations = [
                category.toLowerCase(),
                // Convert camelCase to spaced (e.g., technicalAccuracy -> technical accuracy)
                category.replace(/([A-Z])/g, ' $1').toLowerCase().trim(),
                // Title case version
                category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1'),
              ];
              
              const categoryInPriority = improvementPlan.priorityAreas.some(area => 
                categoryVariations.some(variation => 
                  area.toLowerCase().includes(variation) ||
                  variation.includes(area.toLowerCase())
                )
              );
              
              const categoryInRecommendations = improvementPlan.recommendations.some(rec =>
                categoryVariations.some(variation => 
                  rec.category.toLowerCase().includes(variation) ||
                  variation.includes(rec.category.toLowerCase())
                )
              );
              
              expect(categoryInPriority || categoryInRecommendations).toBe(true);
            });
          }

          // Minimum improvement time should be reasonable
          expect(improvementPlan.estimatedTimeToImprove).toBeGreaterThanOrEqual(7);
          expect(improvementPlan.estimatedTimeToImprove).toBeLessThanOrEqual(365);

          // If there are priority areas, there should be recommendations
          if (improvementPlan.priorityAreas.length > 0) {
            expect(improvementPlan.recommendations.length).toBeGreaterThan(0);
          }

          // Always ensure we have at least some form of recommendation
          expect(improvementPlan.recommendations.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  });

  /**
   * Property Test: Transcript Annotation Completeness
   * 
   * Tests that annotated transcripts include all necessary visual elements
   * and highlighting for comprehensive feedback.
   */
  it('should generate annotated transcripts with complete visual feedback elements', () => {
    fc.assert(
      fc.property(sessionGenerator, (session: InterviewSession) => {
        const transcript = reportGenerator.generateAnnotatedTranscript(session);

        // Requirement 6.2: Visual representations with color-coding
        // Requirement 6.3: Highlighted transcripts with areas for improvement
        expect(transcript).toBeDefined();
        expect(Array.isArray(transcript.segments)).toBe(true);
        expect(Array.isArray(transcript.highlights)).toBe(true);
        expect(typeof transcript.summary).toBe('string');

        // Should have segments for each question and response
        const expectedSegments = session.questions.length + session.responses.length;
        expect(transcript.segments.length).toBe(expectedSegments);

        // Each segment should have required properties
        transcript.segments.forEach(segment => {
          expect(typeof segment.startTime).toBe('number');
          expect(typeof segment.endTime).toBe('number');
          expect(typeof segment.text).toBe('string');
          expect(['interviewer', 'candidate']).toContain(segment.speaker);
          expect(typeof segment.confidence).toBe('number');
          expect(segment.confidence).toBeGreaterThanOrEqual(0);
          expect(segment.confidence).toBeLessThanOrEqual(1);
          expect(segment.startTime).toBeLessThanOrEqual(segment.endTime);
        });

        // Highlights should have proper visual elements
        transcript.highlights.forEach(highlight => {
          expect(typeof highlight.startTime).toBe('number');
          expect(typeof highlight.endTime).toBe('number');
          expect(['strength', 'weakness', 'improvement']).toContain(highlight.type);
          expect(typeof highlight.description).toBe('string');
          expect(highlight.description.length).toBeGreaterThan(0);
          expect(typeof highlight.color).toBe('string');
          expect(highlight.color.length).toBeGreaterThan(0);
          expect(highlight.startTime).toBeLessThanOrEqual(highlight.endTime);
        });

        // Summary should contain meaningful information
        expect(transcript.summary.length).toBeGreaterThan(0);
        expect(transcript.summary).toContain(session.responses.length.toString());

        return true;
      }),
      { 
        numRuns: 100,
        verbose: true,
      }
    );
  });
});