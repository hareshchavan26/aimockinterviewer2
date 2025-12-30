import { DefaultAIInterviewerService } from '../services/ai-interviewer-service';
import { TechnicalEvaluationService } from '../services/technical-evaluation-service';
import {
  TechnicalEvaluationContext,
  DifficultyAdaptationContext,
  TechnicalResponseEvaluation,
  DifficultyLevel,
  TechnicalDomain,
  SkillImportance,
  AdaptationStrategy,
  TrendDirection,
  QuestionType,
  InterviewerMood,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
} from '../types/ai-interviewer';

// Mock OpenAI
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

describe('Technical Evaluation System', () => {
  let aiService: DefaultAIInterviewerService;
  let technicalService: TechnicalEvaluationService;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create services
    aiService = new DefaultAIInterviewerService('test-api-key');
    technicalService = new TechnicalEvaluationService();
    
    // Get mock OpenAI instance
    mockOpenAI = (aiService as any).openai;
  });

  describe('TechnicalEvaluationService', () => {
    describe('getRoleSpecificCriteria', () => {
      it('should return software engineer criteria for technology industry', () => {
        const criteria = technicalService.getRoleSpecificCriteria('Software Engineer', 'Technology');
        
        expect(criteria.role).toBe('Software Engineer');
        expect(criteria.industry).toBe('Technology');
        expect(criteria.requiredSkills).toHaveLength(4);
        
        const algorithmSkill = criteria.requiredSkills.find(skill => skill.name === 'Algorithm Design');
        expect(algorithmSkill).toBeDefined();
        expect(algorithmSkill?.importance).toBe(SkillImportance.CRITICAL);
        expect(algorithmSkill?.keywords).toContain('algorithm');
      });

      it('should return frontend developer criteria for technology industry', () => {
        const criteria = technicalService.getRoleSpecificCriteria('Frontend Developer', 'Technology');
        
        expect(criteria.role).toBe('Frontend Developer');
        expect(criteria.requiredSkills).toHaveLength(4);
        
        const jsSkill = criteria.requiredSkills.find(skill => skill.name === 'JavaScript/TypeScript');
        expect(jsSkill).toBeDefined();
        expect(jsSkill?.importance).toBe(SkillImportance.CRITICAL);
      });

      it('should return data scientist criteria for technology industry', () => {
        const criteria = technicalService.getRoleSpecificCriteria('Data Scientist', 'Technology');
        
        expect(criteria.role).toBe('Data Scientist');
        expect(criteria.requiredSkills).toHaveLength(4);
        
        const statsSkill = criteria.requiredSkills.find(skill => skill.name === 'Statistical Analysis');
        expect(statsSkill).toBeDefined();
        expect(statsSkill?.importance).toBe(SkillImportance.CRITICAL);
      });

      it('should return default criteria for unknown role', () => {
        const criteria = technicalService.getRoleSpecificCriteria('Unknown Role', 'Unknown Industry');
        
        expect(criteria.role).toBe('Unknown Role');
        expect(criteria.industry).toBe('Unknown Industry');
        expect(criteria.requiredSkills).toHaveLength(2);
        expect(criteria.requiredSkills[0].name).toBe('Problem Solving');
      });
    });

    describe('getTechnicalDomainForRole', () => {
      it('should map software engineer to software engineering domain', () => {
        const domain = technicalService.getTechnicalDomainForRole('Software Engineer');
        expect(domain).toBe(TechnicalDomain.SOFTWARE_ENGINEERING);
      });

      it('should map frontend developer to frontend development domain', () => {
        const domain = technicalService.getTechnicalDomainForRole('Frontend Developer');
        expect(domain).toBe(TechnicalDomain.FRONTEND_DEVELOPMENT);
      });

      it('should map data scientist to data science domain', () => {
        const domain = technicalService.getTechnicalDomainForRole('Data Scientist');
        expect(domain).toBe(TechnicalDomain.DATA_SCIENCE);
      });

      it('should default to software engineering for unknown roles', () => {
        const domain = technicalService.getTechnicalDomainForRole('Unknown Role');
        expect(domain).toBe(TechnicalDomain.SOFTWARE_ENGINEERING);
      });
    });
  });

  describe('DefaultAIInterviewerService - Technical Evaluation', () => {
    const mockPersonalityState = {
      name: 'Technical Interviewer',
      style: InterviewStyle.PROFESSIONAL,
      tone: InterviewTone.PROFESSIONAL,
      formality: FormalityLevel.FORMAL,
      adaptiveness: 0.7,
      followUpIntensity: 0.6,
      encouragementLevel: 0.5,
      currentMood: InterviewerMood.ANALYTICAL,
      adaptationLevel: 0.3,
      userEngagementLevel: 0.7,
      sessionProgress: 0.4,
      conversationHistory: [],
      lastQuestionType: QuestionType.TECHNICAL,
      consecutiveFollowUps: 0,
    };

    const mockQuestion = {
      id: 'test-question-1',
      text: 'Implement a function to reverse a linked list',
      type: QuestionType.TECHNICAL,
      category: 'algorithms',
      difficulty: DifficultyLevel.MID,
      evaluationCriteria: [],
      timeLimit: 300,
      metadata: {
        source: 'test',
        version: 1,
        usageCount: 0,
        generatedAt: new Date(),
        modelVersion: 'gpt-4',
      },
    };

    const mockUserResponse = {
      questionId: 'test-question-1',
      questionText: 'Implement a function to reverse a linked list',
      responseText: 'I would use an iterative approach with three pointers: prev, current, and next...',
      duration: 180,
      confidence: 0.8,
      isSkipped: false,
      timestamp: new Date(),
      evaluationScore: 85,
    };

    describe('evaluateTechnicalResponse', () => {
      it('should successfully evaluate a technical response', async () => {
        const mockAIResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                overallScore: 85,
                technicalAccuracy: 90,
                completeness: 80,
                criteriaScores: [{
                  criteriaName: 'Technical Accuracy',
                  score: 90,
                  feedback: 'Excellent understanding of linked list reversal',
                }],
                roleSpecificScores: [{
                  skillName: 'Algorithm Design',
                  score: 85,
                  importance: 'critical',
                  feedback: 'Good algorithmic approach',
                  examples: ['Correctly identified iterative solution'],
                }],
                codeQuality: {
                  readability: 85,
                  maintainability: 80,
                  efficiency: 90,
                  bestPractices: 75,
                  errorHandling: 70,
                },
                algorithmicComplexity: {
                  timeComplexity: 'O(n)',
                  spaceComplexity: 'O(1)',
                  isOptimal: true,
                  improvementSuggestions: [],
                },
                difficultyAssessment: {
                  perceivedDifficulty: 'mid',
                  actualPerformance: 85,
                  isAppropriate: true,
                  reasoning: 'Performance matches expected level',
                },
                adaptationRecommendation: {
                  recommendedLevel: 'senior',
                  confidence: 0.8,
                  reasoning: 'Strong performance suggests readiness for harder questions',
                  adaptationStrategy: 'increase_difficulty',
                },
                strengths: ['Strong algorithmic thinking', 'Clear explanation'],
                improvements: ['Could discuss edge cases', 'Consider alternative approaches'],
                followUpSuggestions: ['Ask about optimization', 'Explore recursive solution'],
                confidence: 0.9,
              }),
            },
          }],
        };

        mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

        const roleSpecificCriteria = technicalService.getRoleSpecificCriteria('Software Engineer', 'Technology');
        const technicalDomain = technicalService.getTechnicalDomainForRole('Software Engineer');

        const context: TechnicalEvaluationContext = {
          sessionId: 'test-session',
          question: mockQuestion,
          userResponse: mockUserResponse,
          roleSpecificCriteria,
          technicalDomain,
          personalityState: mockPersonalityState,
        };

        const evaluation = await aiService.evaluateTechnicalResponse(context);

        expect(evaluation).toBeDefined();
        expect(evaluation.overallScore).toBe(85);
        expect(evaluation.technicalAccuracy).toBe(90);
        expect(evaluation.completeness).toBe(80);
        expect(evaluation.roleSpecificScores).toHaveLength(1);
        expect(evaluation.roleSpecificScores[0].skillName).toBe('Algorithm Design');
        expect(evaluation.codeQuality).toBeDefined();
        expect(evaluation.algorithmicComplexity).toBeDefined();
        expect(evaluation.difficultyAssessment).toBeDefined();
        expect(evaluation.adaptationRecommendation).toBeDefined();
        expect(evaluation.adaptationRecommendation.recommendedLevel).toBe(DifficultyLevel.SENIOR);
        expect(evaluation.adaptationRecommendation.adaptationStrategy).toBe(AdaptationStrategy.INCREASE_DIFFICULTY);
      });

      it('should handle OpenAI API errors gracefully', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

        const roleSpecificCriteria = technicalService.getRoleSpecificCriteria('Software Engineer', 'Technology');
        const technicalDomain = technicalService.getTechnicalDomainForRole('Software Engineer');

        const context: TechnicalEvaluationContext = {
          sessionId: 'test-session',
          question: mockQuestion,
          userResponse: mockUserResponse,
          roleSpecificCriteria,
          technicalDomain,
          personalityState: mockPersonalityState,
        };

        await expect(aiService.evaluateTechnicalResponse(context)).rejects.toThrow('Failed to evaluate technical response');
      });

      it('should handle malformed JSON response with fallback', async () => {
        const mockAIResponse = {
          choices: [{
            message: {
              content: 'Invalid JSON response',
            },
          }],
        };

        mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

        const roleSpecificCriteria = technicalService.getRoleSpecificCriteria('Software Engineer', 'Technology');
        const technicalDomain = technicalService.getTechnicalDomainForRole('Software Engineer');

        const context: TechnicalEvaluationContext = {
          sessionId: 'test-session',
          question: mockQuestion,
          userResponse: mockUserResponse,
          roleSpecificCriteria,
          technicalDomain,
          personalityState: mockPersonalityState,
        };

        const evaluation = await aiService.evaluateTechnicalResponse(context);

        expect(evaluation).toBeDefined();
        expect(evaluation.overallScore).toBe(50);
        expect(evaluation.technicalAccuracy).toBe(50);
        expect(evaluation.completeness).toBe(50);
        expect(evaluation.confidence).toBe(0.3);
        expect(evaluation.metadata.flags).toContain('parsing_error');
      });
    });

    describe('adaptDifficulty', () => {
      it('should increase difficulty for excellent performance', async () => {
        const context: DifficultyAdaptationContext = {
          sessionId: 'test-session',
          userId: 'test-user',
          interviewConfig: {
            id: 'test-config',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.MID,
            duration: 60,
            questionTypes: [QuestionType.TECHNICAL],
            focusAreas: [],
            aiPersonality: {
              name: 'Test',
              style: InterviewStyle.PROFESSIONAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.FORMAL,
              adaptiveness: 0.5,
              followUpIntensity: 0.5,
              encouragementLevel: 0.5,
            },
          },
          sessionHistory: [],
          currentDifficulty: DifficultyLevel.MID,
          performanceMetrics: {
            averageScore: 90,
            scoreVariance: 5,
            responseTime: 150,
            skipRate: 0.0,
            confidenceLevel: 0.9,
            improvementTrend: TrendDirection.IMPROVING,
          },
        };

        const adaptedDifficulty = await aiService.adaptDifficulty(context);

        expect(adaptedDifficulty).toBe(DifficultyLevel.SENIOR);
      });

      it('should decrease difficulty for poor performance', async () => {
        const context: DifficultyAdaptationContext = {
          sessionId: 'test-session',
          userId: 'test-user',
          interviewConfig: {
            id: 'test-config',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.MID,
            duration: 60,
            questionTypes: [QuestionType.TECHNICAL],
            focusAreas: [],
            aiPersonality: {
              name: 'Test',
              style: InterviewStyle.PROFESSIONAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.FORMAL,
              adaptiveness: 0.5,
              followUpIntensity: 0.5,
              encouragementLevel: 0.5,
            },
          },
          sessionHistory: [],
          currentDifficulty: DifficultyLevel.MID,
          performanceMetrics: {
            averageScore: 40,
            scoreVariance: 20,
            responseTime: 300,
            skipRate: 0.3,
            confidenceLevel: 0.2,
            improvementTrend: TrendDirection.DECLINING,
          },
        };

        const adaptedDifficulty = await aiService.adaptDifficulty(context);

        expect(adaptedDifficulty).toBe(DifficultyLevel.JUNIOR);
      });

      it('should maintain difficulty for appropriate performance', async () => {
        const context: DifficultyAdaptationContext = {
          sessionId: 'test-session',
          userId: 'test-user',
          interviewConfig: {
            id: 'test-config',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.MID,
            duration: 60,
            questionTypes: [QuestionType.TECHNICAL],
            focusAreas: [],
            aiPersonality: {
              name: 'Test',
              style: InterviewStyle.PROFESSIONAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.FORMAL,
              adaptiveness: 0.5,
              followUpIntensity: 0.5,
              encouragementLevel: 0.5,
            },
          },
          sessionHistory: [],
          currentDifficulty: DifficultyLevel.MID,
          performanceMetrics: {
            averageScore: 75,
            scoreVariance: 10,
            responseTime: 200,
            skipRate: 0.1,
            confidenceLevel: 0.6,
            improvementTrend: TrendDirection.STABLE,
          },
        };

        const adaptedDifficulty = await aiService.adaptDifficulty(context);

        expect(adaptedDifficulty).toBe(DifficultyLevel.MID);
      });

      it('should not increase beyond executive level', async () => {
        const context: DifficultyAdaptationContext = {
          sessionId: 'test-session',
          userId: 'test-user',
          interviewConfig: {
            id: 'test-config',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.EXECUTIVE,
            duration: 60,
            questionTypes: [QuestionType.TECHNICAL],
            focusAreas: [],
            aiPersonality: {
              name: 'Test',
              style: InterviewStyle.PROFESSIONAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.FORMAL,
              adaptiveness: 0.5,
              followUpIntensity: 0.5,
              encouragementLevel: 0.5,
            },
          },
          sessionHistory: [],
          currentDifficulty: DifficultyLevel.EXECUTIVE,
          performanceMetrics: {
            averageScore: 95,
            scoreVariance: 2,
            responseTime: 120,
            skipRate: 0.0,
            confidenceLevel: 0.95,
            improvementTrend: TrendDirection.IMPROVING,
          },
        };

        const adaptedDifficulty = await aiService.adaptDifficulty(context);

        expect(adaptedDifficulty).toBe(DifficultyLevel.EXECUTIVE);
      });

      it('should not decrease below entry level', async () => {
        const context: DifficultyAdaptationContext = {
          sessionId: 'test-session',
          userId: 'test-user',
          interviewConfig: {
            id: 'test-config',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.ENTRY,
            duration: 60,
            questionTypes: [QuestionType.TECHNICAL],
            focusAreas: [],
            aiPersonality: {
              name: 'Test',
              style: InterviewStyle.PROFESSIONAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.FORMAL,
              adaptiveness: 0.5,
              followUpIntensity: 0.5,
              encouragementLevel: 0.5,
            },
          },
          sessionHistory: [],
          currentDifficulty: DifficultyLevel.ENTRY,
          performanceMetrics: {
            averageScore: 30,
            scoreVariance: 25,
            responseTime: 400,
            skipRate: 0.5,
            confidenceLevel: 0.1,
            improvementTrend: TrendDirection.DECLINING,
          },
        };

        const adaptedDifficulty = await aiService.adaptDifficulty(context);

        expect(adaptedDifficulty).toBe(DifficultyLevel.ENTRY);
      });
    });
  });
});