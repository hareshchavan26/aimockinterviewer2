import fc from 'fast-check';
import { DefaultAIInterviewerService } from '../services/ai-interviewer-service';
import { TechnicalEvaluationService } from '../services/technical-evaluation-service';
import {
  TechnicalEvaluationContext,
  TechnicalResponseEvaluation,
  DifficultyLevel,
  QuestionType,
  TechnicalDomain,
  SkillImportance,
  InterviewerMood,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
} from '../types/ai-interviewer';

// Mock OpenAI to ensure deterministic behavior
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('Property 9: Technical Accuracy Evaluation', () => {
  let aiService: DefaultAIInterviewerService;
  let technicalService: TechnicalEvaluationService;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new DefaultAIInterviewerService('test-api-key');
    technicalService = new TechnicalEvaluationService();
    mockOpenAI = (aiService as any).openai;
  });

  // Custom arbitraries for technical evaluation
  const difficultyArb = fc.constantFrom(
    DifficultyLevel.ENTRY,
    DifficultyLevel.JUNIOR,
    DifficultyLevel.MID,
    DifficultyLevel.SENIOR,
    DifficultyLevel.PRINCIPAL,
    DifficultyLevel.EXECUTIVE
  );

  const roleArb = fc.constantFrom(
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Data Scientist',
    'ML Engineer',
    'DevOps Engineer'
  );

  const industryArb = fc.constantFrom(
    'Technology',
    'Finance',
    'Healthcare',
    'E-commerce'
  );

  const technicalResponseArb = fc.record({
    questionId: fc.uuid(),
    questionText: fc.string({ minLength: 10, maxLength: 200 }),
    responseText: fc.option(fc.string({ minLength: 5, maxLength: 1000 }), { nil: undefined }),
    duration: fc.integer({ min: 10, max: 600 }),
    confidence: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }), { nil: undefined }),
    isSkipped: fc.boolean(),
    timestamp: fc.date(),
    evaluationScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  });

  const technicalQuestionArb = fc.record({
    id: fc.uuid(),
    text: fc.string({ minLength: 10, max: 200 }),
    type: fc.constantFrom(QuestionType.TECHNICAL, QuestionType.CODING, QuestionType.SYSTEM_DESIGN),
    category: fc.constantFrom('algorithms', 'data-structures', 'system-design', 'coding'),
    difficulty: difficultyArb,
    evaluationCriteria: fc.array(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 5, maxLength: 50 }),
      description: fc.string({ minLength: 10, maxLength: 100 }),
      weight: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
      type: fc.constantFrom('technical_accuracy', 'problem_solving', 'communication'),
    }), { minLength: 1, maxLength: 5 }),
    timeLimit: fc.integer({ min: 60, max: 1800 }),
    metadata: fc.record({
      source: fc.constant('test'),
      version: fc.constant(1),
      usageCount: fc.constant(0),
      generatedAt: fc.date(),
      modelVersion: fc.constant('gpt-4'),
    }),
  });

  const personalityStateArb = fc.record({
    name: fc.string({ minLength: 5, maxLength: 30 }),
    style: fc.constantFrom(...Object.values(InterviewStyle)),
    tone: fc.constantFrom(...Object.values(InterviewTone)),
    formality: fc.constantFrom(...Object.values(FormalityLevel)),
    adaptiveness: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    followUpIntensity: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    encouragementLevel: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    currentMood: fc.constantFrom(...Object.values(InterviewerMood)),
    adaptationLevel: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    userEngagementLevel: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    sessionProgress: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
    conversationHistory: fc.constant([]),
    lastQuestionType: fc.constantFrom(...Object.values(QuestionType)),
    consecutiveFollowUps: fc.integer({ min: 0, max: 5 }),
  });

  // Mock AI response generator that creates consistent responses
  const generateMockAIResponse = (
    role: string,
    difficulty: DifficultyLevel,
    responseText?: string
  ) => {
    const baseScore = responseText ? Math.min(90, responseText.length / 10 + 50) : 30;
    const difficultyMultiplier = {
      [DifficultyLevel.ENTRY]: 1.1,
      [DifficultyLevel.JUNIOR]: 1.0,
      [DifficultyLevel.MID]: 0.9,
      [DifficultyLevel.SENIOR]: 0.8,
      [DifficultyLevel.PRINCIPAL]: 0.7,
      [DifficultyLevel.EXECUTIVE]: 0.6,
    }[difficulty];

    const adjustedScore = Math.max(0, Math.min(100, Math.floor(baseScore * difficultyMultiplier)));

    // Generate role-specific skills based on role
    let roleSpecificSkill = 'Algorithm Design';
    if (role.toLowerCase().includes('frontend')) {
      roleSpecificSkill = 'JavaScript/TypeScript';
    } else if (role.toLowerCase().includes('backend')) {
      roleSpecificSkill = 'System Architecture';
    } else if (role.toLowerCase().includes('data')) {
      roleSpecificSkill = 'Statistical Analysis';
    } else if (role.toLowerCase().includes('devops')) {
      roleSpecificSkill = 'Infrastructure Management';
    }

    return {
      choices: [{
        message: {
          content: JSON.stringify({
            overallScore: adjustedScore,
            technicalAccuracy: Math.min(100, adjustedScore + 5),
            completeness: Math.max(0, adjustedScore - 5),
            criteriaScores: [{
              criteriaName: 'Technical Accuracy',
              score: Math.min(100, adjustedScore + 5),
              feedback: `Technical evaluation for ${role}`,
            }],
            roleSpecificScores: [{
              skillName: roleSpecificSkill,
              score: adjustedScore,
              importance: 'critical',
              feedback: `Role-specific evaluation for ${role}`,
              examples: ['Demonstrated understanding'],
            }],
            codeQuality: responseText ? {
              readability: adjustedScore,
              maintainability: adjustedScore - 5,
              efficiency: adjustedScore + 5,
              bestPractices: adjustedScore,
              errorHandling: adjustedScore - 10,
            } : undefined,
            algorithmicComplexity: responseText ? {
              timeComplexity: 'O(n)',
              spaceComplexity: 'O(1)',
              isOptimal: adjustedScore > 70,
              improvementSuggestions: adjustedScore < 70 ? ['Consider optimization'] : [],
            } : undefined,
            difficultyAssessment: {
              perceivedDifficulty: difficulty,
              actualPerformance: adjustedScore,
              isAppropriate: adjustedScore >= 50 && adjustedScore <= 90,
              reasoning: 'Performance assessment based on response quality',
            },
            adaptationRecommendation: {
              recommendedLevel: adjustedScore > 85 ? 'senior' : adjustedScore < 50 ? 'junior' : difficulty,
              confidence: 0.8,
              reasoning: 'Adaptation based on performance',
              adaptationStrategy: adjustedScore > 85 ? 'increase_difficulty' : 'maintain_level',
            },
            strengths: ['Technical understanding'],
            improvements: ['Could improve clarity'],
            followUpSuggestions: ['Ask for clarification'],
            confidence: 0.8,
          }),
        },
      }],
    };
  };

  /**
   * Property 9: Technical Accuracy Evaluation
   * 
   * For any technical response evaluation, the assessment should be consistent 
   * and based on defined criteria for the specific role.
   * 
   * Validates: Requirements 4.6, 6.7
   * - 4.6: WHEN technical evaluation occurs, THE System SHALL provide role-specific assessment criteria
   * - 6.7: THE Report SHALL include all analyzed components and metrics
   */
  it('should provide consistent role-specific technical evaluation with complete metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          role: roleArb,
          industry: industryArb,
          question: technicalQuestionArb,
          userResponse: technicalResponseArb,
          personalityState: personalityStateArb,
        }),
        async ({ sessionId, role, industry, question, userResponse, personalityState }) => {
          // Setup mock AI response based on inputs
          const mockResponse = generateMockAIResponse(role, question.difficulty, userResponse.responseText);
          mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

          // Get role-specific criteria
          const roleSpecificCriteria = technicalService.getRoleSpecificCriteria(role, industry);
          const technicalDomain = technicalService.getTechnicalDomainForRole(role);

          const context: TechnicalEvaluationContext = {
            sessionId,
            question,
            userResponse,
            roleSpecificCriteria,
            technicalDomain,
            personalityState,
          };

          // Perform evaluation
          const evaluation = await aiService.evaluateTechnicalResponse(context);

          // Property 1: Role-specific criteria consistency (Requirement 4.6)
          // The evaluation should reflect the role-specific criteria
          expect(evaluation.roleSpecificScores).toBeDefined();
          expect(evaluation.roleSpecificScores.length).toBeGreaterThan(0);
          
          // Each role-specific score should correspond to skills defined for the role
          evaluation.roleSpecificScores.forEach(score => {
            expect(score.skillName).toBeDefined();
            expect(score.score).toBeGreaterThanOrEqual(0);
            expect(score.score).toBeLessThanOrEqual(100);
            expect(score.importance).toBeDefined();
            expect(Object.values(SkillImportance)).toContain(score.importance);
            expect(score.feedback).toBeDefined();
            expect(typeof score.feedback).toBe('string');
          });

          // Property 2: Complete metrics inclusion (Requirement 6.7)
          // The report should include all analyzed components and metrics
          expect(evaluation.overallScore).toBeGreaterThanOrEqual(0);
          expect(evaluation.overallScore).toBeLessThanOrEqual(100);
          expect(evaluation.technicalAccuracy).toBeGreaterThanOrEqual(0);
          expect(evaluation.technicalAccuracy).toBeLessThanOrEqual(100);
          expect(evaluation.completeness).toBeGreaterThanOrEqual(0);
          expect(evaluation.completeness).toBeLessThanOrEqual(100);

          // Essential evaluation components must be present
          expect(evaluation.criteriaScores).toBeDefined();
          expect(Array.isArray(evaluation.criteriaScores)).toBe(true);
          expect(evaluation.strengths).toBeDefined();
          expect(Array.isArray(evaluation.strengths)).toBe(true);
          expect(evaluation.improvements).toBeDefined();
          expect(Array.isArray(evaluation.improvements)).toBe(true);
          expect(evaluation.followUpSuggestions).toBeDefined();
          expect(Array.isArray(evaluation.followUpSuggestions)).toBe(true);

          // Confidence and metadata must be present
          expect(evaluation.confidence).toBeGreaterThanOrEqual(0);
          expect(evaluation.confidence).toBeLessThanOrEqual(1);
          expect(evaluation.metadata).toBeDefined();
          expect(evaluation.metadata.processingTime).toBeDefined();
          expect(evaluation.metadata.modelVersion).toBeDefined();

          // Difficulty assessment must be complete
          expect(evaluation.difficultyAssessment).toBeDefined();
          expect(evaluation.difficultyAssessment.perceivedDifficulty).toBeDefined();
          expect(evaluation.difficultyAssessment.actualPerformance).toBeGreaterThanOrEqual(0);
          expect(evaluation.difficultyAssessment.actualPerformance).toBeLessThanOrEqual(100);
          expect(typeof evaluation.difficultyAssessment.isAppropriate).toBe('boolean');
          expect(evaluation.difficultyAssessment.reasoning).toBeDefined();

          // Adaptation recommendation must be complete
          expect(evaluation.adaptationRecommendation).toBeDefined();
          expect(evaluation.adaptationRecommendation.recommendedLevel).toBeDefined();
          expect(evaluation.adaptationRecommendation.confidence).toBeGreaterThanOrEqual(0);
          expect(evaluation.adaptationRecommendation.confidence).toBeLessThanOrEqual(1);
          expect(evaluation.adaptationRecommendation.reasoning).toBeDefined();
          expect(evaluation.adaptationRecommendation.adaptationStrategy).toBeDefined();

          // Property 3: Consistency across multiple evaluations of same input
          // Evaluating the same input should produce consistent results
          const secondEvaluation = await aiService.evaluateTechnicalResponse(context);
          
          // Core scores should be identical for same input
          expect(secondEvaluation.overallScore).toBe(evaluation.overallScore);
          expect(secondEvaluation.technicalAccuracy).toBe(evaluation.technicalAccuracy);
          expect(secondEvaluation.completeness).toBe(evaluation.completeness);
          
          // Role-specific scores should be consistent
          expect(secondEvaluation.roleSpecificScores.length).toBe(evaluation.roleSpecificScores.length);
          secondEvaluation.roleSpecificScores.forEach((score, index) => {
            expect(score.score).toBe(evaluation.roleSpecificScores[index].score);
            expect(score.skillName).toBe(evaluation.roleSpecificScores[index].skillName);
          });
        }
      ),
      {
        numRuns: 100,
        timeout: 30000,
        endOnFailure: true,
      }
    );
  }, 35000);

  /**
   * Property 9.2: Technical Domain Consistency
   * 
   * For any role, the technical domain mapping should be consistent and 
   * the evaluation should reflect domain-specific expertise.
   */
  it('should maintain consistent technical domain mapping and domain-specific evaluation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          role: roleArb,
          industry: industryArb,
          question: technicalQuestionArb,
          userResponse: technicalResponseArb,
          personalityState: personalityStateArb,
        }),
        async ({ sessionId, role, industry, question, userResponse, personalityState }) => {
          // Setup mock response
          const mockResponse = generateMockAIResponse(role, question.difficulty, userResponse.responseText);
          mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

          // Get technical domain for role - should be consistent
          const domain1 = technicalService.getTechnicalDomainForRole(role);
          const domain2 = technicalService.getTechnicalDomainForRole(role);
          expect(domain1).toBe(domain2); // Domain mapping must be deterministic

          // Get role criteria - should be consistent
          const criteria1 = technicalService.getRoleSpecificCriteria(role, industry);
          const criteria2 = technicalService.getRoleSpecificCriteria(role, industry);
          expect(criteria1.role).toBe(criteria2.role);
          expect(criteria1.industry).toBe(criteria2.industry);
          expect(criteria1.requiredSkills.length).toBe(criteria2.requiredSkills.length);

          // Evaluation should reflect domain expertise
          const context: TechnicalEvaluationContext = {
            sessionId,
            question,
            userResponse,
            roleSpecificCriteria: criteria1,
            technicalDomain: domain1,
            personalityState,
          };

          const evaluation = await aiService.evaluateTechnicalResponse(context);

          // Domain-specific validation
          if (role.toLowerCase().includes('data')) {
            expect(domain1).toBe(TechnicalDomain.DATA_SCIENCE);
            // Should have data science specific skills
            const hasDataSkills = evaluation.roleSpecificScores.some(score => 
              score.skillName.toLowerCase().includes('statistical') ||
              score.skillName.toLowerCase().includes('machine learning') ||
              score.skillName.toLowerCase().includes('data')
            );
            expect(hasDataSkills).toBe(true);
          }

          if (role.toLowerCase().includes('frontend')) {
            expect(domain1).toBe(TechnicalDomain.FRONTEND_DEVELOPMENT);
            // Should have frontend specific skills
            const hasFrontendSkills = evaluation.roleSpecificScores.some(score => 
              score.skillName.toLowerCase().includes('javascript') ||
              score.skillName.toLowerCase().includes('react') ||
              score.skillName.toLowerCase().includes('css')
            );
            expect(hasFrontendSkills).toBe(true);
          }

          // All evaluations should have valid technical accuracy scores
          expect(evaluation.technicalAccuracy).toBeGreaterThanOrEqual(0);
          expect(evaluation.technicalAccuracy).toBeLessThanOrEqual(100);
        }
      ),
      {
        numRuns: 50,
        timeout: 20000,
      }
    );
  }, 25000);

  /**
   * Property 9.3: Evaluation Completeness Under Edge Cases
   * 
   * Even with minimal or missing response data, the evaluation should 
   * still provide complete metrics and meaningful feedback.
   */
  it('should provide complete evaluation even with edge case inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          role: roleArb,
          industry: industryArb,
          question: technicalQuestionArb,
          // Edge case: minimal or missing response data
          userResponse: fc.record({
            questionId: fc.uuid(),
            questionText: fc.string({ minLength: 1, maxLength: 10 }),
            responseText: fc.option(fc.oneof(
              fc.constant(''), // Empty response
              fc.constant('I don\'t know'), // Minimal response
              fc.string({ minLength: 1, maxLength: 20 }) // Very short response
            ), { nil: undefined }),
            duration: fc.integer({ min: 1, max: 30 }), // Very short duration
            confidence: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(0.3), noNaN: true }), { nil: undefined }), // Low confidence
            isSkipped: fc.boolean(),
            timestamp: fc.date(),
          }),
          personalityState: personalityStateArb,
        }),
        async ({ sessionId, role, industry, question, userResponse, personalityState }) => {
          // Setup mock response for edge cases
          const mockResponse = generateMockAIResponse(role, question.difficulty, userResponse.responseText);
          mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

          const roleSpecificCriteria = technicalService.getRoleSpecificCriteria(role, industry);
          const technicalDomain = technicalService.getTechnicalDomainForRole(role);

          const context: TechnicalEvaluationContext = {
            sessionId,
            question,
            userResponse,
            roleSpecificCriteria,
            technicalDomain,
            personalityState,
          };

          const evaluation = await aiService.evaluateTechnicalResponse(context);

          // Even with edge case inputs, evaluation must be complete
          expect(evaluation.overallScore).toBeGreaterThanOrEqual(0);
          expect(evaluation.overallScore).toBeLessThanOrEqual(100);
          expect(evaluation.technicalAccuracy).toBeGreaterThanOrEqual(0);
          expect(evaluation.technicalAccuracy).toBeLessThanOrEqual(100);
          expect(evaluation.completeness).toBeGreaterThanOrEqual(0);
          expect(evaluation.completeness).toBeLessThanOrEqual(100);

          // Must have role-specific scores even for poor responses
          expect(evaluation.roleSpecificScores).toBeDefined();
          expect(evaluation.roleSpecificScores.length).toBeGreaterThan(0);

          // Must have feedback even for minimal responses
          expect(evaluation.strengths.length + evaluation.improvements.length).toBeGreaterThan(0);
          expect(evaluation.followUpSuggestions).toBeDefined();

          // Difficulty assessment must be present and reasonable
          expect(evaluation.difficultyAssessment).toBeDefined();
          expect(evaluation.difficultyAssessment.actualPerformance).toBeGreaterThanOrEqual(0);
          expect(evaluation.difficultyAssessment.actualPerformance).toBeLessThanOrEqual(100);

          // For very poor responses, should recommend easier difficulty
          if (!userResponse.responseText || userResponse.responseText.length < 10) {
            expect(evaluation.difficultyAssessment.actualPerformance).toBeLessThan(60);
          }

          // Adaptation recommendation must be present and logical
          expect(evaluation.adaptationRecommendation).toBeDefined();
          expect(evaluation.adaptationRecommendation.confidence).toBeGreaterThanOrEqual(0);
          expect(evaluation.adaptationRecommendation.confidence).toBeLessThanOrEqual(1);
        }
      ),
      {
        numRuns: 50,
        timeout: 20000,
      }
    );
  }, 25000);
});