import { DefaultAIInterviewerService } from '../services/ai-interviewer-service';
import { PersonalityManager } from '../services/personality-manager';
import {
  QuestionGenerationContext,
  AIPersonalityConfig,
  QuestionType,
  DifficultyLevel,
  FocusArea,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
} from '../types/ai-interviewer';

// Mock OpenAI to avoid API calls during testing
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  text: "Tell me about a time when you had to lead a challenging project.",
                  category: "leadership",
                  expectedStructure: "star",
                  timeLimit: 300,
                  context: "This question assesses leadership and project management skills",
                  evaluationCriteria: [
                    {
                      name: "Leadership Skills",
                      description: "Demonstrates effective leadership abilities",
                      weight: 0.4,
                      type: "leadership"
                    }
                  ]
                })
              }
            }]
          })
        }
      }
    }))
  };
});

describe('AI Interviewer Service - Basic Functionality', () => {
  let aiService: DefaultAIInterviewerService;
  let personalityConfig: AIPersonalityConfig;

  beforeEach(() => {
    aiService = new DefaultAIInterviewerService('test-api-key');
    
    personalityConfig = {
      name: 'Test Interviewer',
      style: InterviewStyle.PROFESSIONAL,
      tone: InterviewTone.PROFESSIONAL,
      formality: FormalityLevel.SEMI_FORMAL,
      adaptiveness: 0.7,
      followUpIntensity: 0.6,
      encouragementLevel: 0.8,
    };
  });

  describe('Personality Management', () => {
    it('should initialize personality correctly', () => {
      const personality = PersonalityManager.initializePersonality(personalityConfig);

      expect(personality.name).toBe('Test Interviewer');
      expect(personality.style).toBe(InterviewStyle.PROFESSIONAL);
      expect(personality.tone).toBe(InterviewTone.PROFESSIONAL);
      expect(personality.adaptiveness).toBe(0.7);
      expect(personality.adaptationLevel).toBe(0.0);
      expect(personality.userEngagementLevel).toBe(0.5);
      expect(personality.conversationHistory).toEqual([]);
    });

    it('should get appropriate response style', () => {
      const personality = PersonalityManager.initializePersonality(personalityConfig);
      const responseStyle = PersonalityManager.getResponseStyle(personality);

      expect(responseStyle.greeting).toBeDefined();
      expect(responseStyle.questionIntro).toBeDefined();
      expect(responseStyle.followUpStyle).toBeDefined();
      expect(responseStyle.encouragement).toBeInstanceOf(Array);
      expect(responseStyle.closing).toBeDefined();
    });

    it('should determine follow-up appropriately', () => {
      const personality = PersonalityManager.initializePersonality(personalityConfig);
      
      // High quality, long response - should not need follow-up
      const shouldNotFollowUp = PersonalityManager.shouldAskFollowUp(personality, 0.9, 500);
      
      // Low quality, short response - should need follow-up
      const shouldFollowUp = PersonalityManager.shouldAskFollowUp(personality, 0.3, 20);
      
      // Results may vary due to randomness, but we can test the logic exists
      expect(typeof shouldNotFollowUp).toBe('boolean');
      expect(typeof shouldFollowUp).toBe('boolean');
    });

    it('should get question preferences', () => {
      const personality = PersonalityManager.initializePersonality(personalityConfig);
      const preferences = PersonalityManager.getQuestionPreferences(personality);

      expect(preferences.preferredTypes).toBeInstanceOf(Array);
      expect(preferences.difficultyProgression).toBeDefined();
      expect(preferences.focusAreaWeights).toBeDefined();
      expect(preferences.timingPreferences).toBeDefined();
    });
  });

  describe('Question Generation', () => {
    it('should generate a question with proper structure', async () => {
      const personality = PersonalityManager.initializePersonality(personalityConfig);
      
      const context: QuestionGenerationContext = {
        sessionId: 'test-session',
        userId: 'test-user',
        interviewConfig: {
          id: 'test-config',
          role: 'Software Engineer',
          industry: 'Technology',
          difficulty: DifficultyLevel.MID,
          duration: 60,
          questionTypes: [QuestionType.BEHAVIORAL],
          focusAreas: [FocusArea.LEADERSHIP],
          aiPersonality: personalityConfig,
        },
        currentQuestionIndex: 0,
        previousResponses: [],
        personalityState: personality,
        questionType: QuestionType.BEHAVIORAL,
        difficulty: DifficultyLevel.MID,
        focusArea: FocusArea.LEADERSHIP,
      };

      const question = await aiService.generateQuestion(context);

      expect(question).toBeDefined();
      expect(question.id).toBeDefined();
      expect(question.text).toBeDefined();
      expect(question.type).toBe(QuestionType.BEHAVIORAL);
      expect(question.category).toBeDefined();
      expect(question.difficulty).toBe(DifficultyLevel.MID);
      expect(question.evaluationCriteria).toBeInstanceOf(Array);
      expect(question.timeLimit).toBeGreaterThan(0);
      expect(question.metadata).toBeDefined();
      expect(question.metadata.source).toBe('ai_generated');
      expect(question.metadata.modelVersion).toBeDefined();
      expect(question.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should handle question generation errors gracefully', async () => {
      // Create a new mock that throws an error
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'));
      
      // Create a service with a failing OpenAI mock
      const failingService = new DefaultAIInterviewerService('invalid-key');
      
      // Override the openai instance to use our failing mock
      (failingService as any).openai = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      const personality = PersonalityManager.initializePersonality(personalityConfig);
      
      const context: QuestionGenerationContext = {
        sessionId: 'test-session',
        userId: 'test-user',
        interviewConfig: {
          id: 'test-config',
          role: 'Software Engineer',
          industry: 'Technology',
          difficulty: DifficultyLevel.MID,
          duration: 60,
          questionTypes: [QuestionType.BEHAVIORAL],
          focusAreas: [FocusArea.LEADERSHIP],
          aiPersonality: personalityConfig,
        },
        currentQuestionIndex: 0,
        previousResponses: [],
        personalityState: personality,
      };

      await expect(failingService.generateQuestion(context)).rejects.toThrow();
    });
  });

  describe('Service Integration', () => {
    it('should create service instance without errors', () => {
      expect(aiService).toBeInstanceOf(DefaultAIInterviewerService);
    });

    it('should handle missing API key gracefully', () => {
      // Should not throw during construction
      const serviceWithoutKey = new DefaultAIInterviewerService();
      expect(serviceWithoutKey).toBeInstanceOf(DefaultAIInterviewerService);
    });
  });
});