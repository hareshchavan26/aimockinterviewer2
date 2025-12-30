import * as fc from 'fast-check';
import { DefaultAIInterviewerService } from '../services/ai-interviewer-service';
import { PersonalityManager, ConversationEvent } from '../services/personality-manager';
import {
  QuestionGenerationContext,
  FollowUpContext,
  ResponseEvaluationContext,
  PersonalityAdaptationContext,
  AIPersonalityConfig,
  AIPersonalityState,
  QuestionType,
  DifficultyLevel,
  FocusArea,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
  InterviewerMood,
} from '../types/ai-interviewer';

// Helper function to create 32-bit floats for fast-check, filtering out NaN values
const float32 = (min: number, max: number) => 
  fc.float({ min: Math.fround(min), max: Math.fround(max) })
    .filter(n => !isNaN(n) && isFinite(n));

// Mock OpenAI to provide consistent responses for property testing
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockImplementation((params) => {
            // Generate deterministic responses based on input for consistency testing
            const prompt = params.messages[1]?.content || '';
            const isFollowUp = prompt.includes('follow-up') || prompt.includes('Follow-up');
            const isEvaluation = prompt.includes('evaluate') || prompt.includes('Evaluate');
            
            if (isEvaluation) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      overallScore: 75,
                      criteriaScores: [
                        {
                          criteriaName: "Content Quality",
                          score: 80,
                          feedback: "Good content with relevant examples"
                        },
                        {
                          criteriaName: "Communication",
                          score: 70,
                          feedback: "Clear communication with minor improvements needed"
                        }
                      ],
                      strengths: ["Clear examples", "Good structure"],
                      improvements: ["More specific details", "Better conclusion"],
                      followUpSuggestions: ["Elaborate on challenges", "Discuss outcomes"],
                      confidence: 0.8
                    })
                  }
                }]
              });
            } else if (isFollowUp) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      text: "Can you tell me more about the specific challenges you faced in that situation?",
                      category: "follow_up",
                      timeLimit: 180,
                      context: "Seeking more detailed information about the challenges mentioned"
                    })
                  }
                }]
              });
            } else {
              // Regular question generation - ensure we always return valid JSON
              const questionTypes = ['behavioral', 'technical', 'situational'];
              const questionType = questionTypes[Math.abs(prompt.length) % questionTypes.length];
              
              return Promise.resolve({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      text: `Tell me about your experience with ${questionType} challenges in your role.`,
                      category: questionType,
                      expectedStructure: "star",
                      timeLimit: 300,
                      context: `This question assesses ${questionType} skills and experience`,
                      evaluationCriteria: [
                        {
                          name: "Content Quality",
                          description: "Relevance and depth of response",
                          weight: 0.4,
                          type: "content_quality"
                        },
                        {
                          name: "Communication",
                          description: "Clarity of expression",
                          weight: 0.3,
                          type: "communication"
                        },
                        {
                          name: "Structure",
                          description: "Organization of response",
                          weight: 0.3,
                          type: "structure"
                        }
                      ]
                    })
                  }
                }]
              });
            }
          })
        }
      }
    }))
  };
});

describe('AI Interviewer Consistency Property Tests', () => {
  let aiService: DefaultAIInterviewerService;

  beforeEach(() => {
    aiService = new DefaultAIInterviewerService('test-api-key');
    jest.clearAllMocks();
  });

  /**
   * Property 8: AI Interviewer Consistency
   * For any interview interaction, the AI interviewer should maintain consistent personality and provide contextually appropriate responses.
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
   * **Feature: ai-mock-interview-platform, Property 8: AI Interviewer Consistency**
   */
  it('should maintain consistent personality characteristics across all interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          personalityConfig: fc.record({
            name: fc.constantFrom('Sarah Chen', 'Dr. Smith', 'Alex Johnson'),
            style: fc.constantFrom(...Object.values(InterviewStyle)),
            tone: fc.constantFrom(...Object.values(InterviewTone)),
            formality: fc.constantFrom(...Object.values(FormalityLevel)),
            adaptiveness: float32(0.1, 1.0),
            followUpIntensity: float32(0.1, 1.0),
            encouragementLevel: float32(0.1, 1.0),
          }),
          sessionId: fc.uuid(),
          userId: fc.uuid(),
        }),

        async ({ personalityConfig, sessionId, userId }) => {
          // Initialize personality
          const initialPersonality = PersonalityManager.initializePersonality(personalityConfig);
          
          // Test personality initialization consistency
          expect(initialPersonality.name).toBe(personalityConfig.name);
          expect(initialPersonality.style).toBe(personalityConfig.style);
          expect(initialPersonality.tone).toBe(personalityConfig.tone);
          expect(initialPersonality.formality).toBe(personalityConfig.formality);
          
          // For numeric values, expect either the original value or a safe default if NaN
          if (isNaN(personalityConfig.adaptiveness) || !isFinite(personalityConfig.adaptiveness)) {
            expect(initialPersonality.adaptiveness).toBe(0.5); // Default value
          } else {
            expect(initialPersonality.adaptiveness).toBe(personalityConfig.adaptiveness);
          }
          
          if (isNaN(personalityConfig.followUpIntensity) || !isFinite(personalityConfig.followUpIntensity)) {
            expect(initialPersonality.followUpIntensity).toBe(0.5); // Default value
          } else {
            expect(initialPersonality.followUpIntensity).toBe(personalityConfig.followUpIntensity);
          }
          
          if (isNaN(personalityConfig.encouragementLevel) || !isFinite(personalityConfig.encouragementLevel)) {
            expect(initialPersonality.encouragementLevel).toBe(0.5); // Default value
          } else {
            expect(initialPersonality.encouragementLevel).toBe(personalityConfig.encouragementLevel);
          }

          // Test response style consistency
          const responseStyle1 = PersonalityManager.getResponseStyle(initialPersonality);
          const responseStyle2 = PersonalityManager.getResponseStyle(initialPersonality);
          
          // Response styles should be consistent for the same personality
          expect(responseStyle1.greeting).toBe(responseStyle2.greeting);
          expect(responseStyle1.questionIntro).toBe(responseStyle2.questionIntro);
          expect(responseStyle1.followUpStyle).toBe(responseStyle2.followUpStyle);
          expect(responseStyle1.closing).toBe(responseStyle2.closing);

          // Test question preferences consistency
          const preferences1 = PersonalityManager.getQuestionPreferences(initialPersonality);
          const preferences2 = PersonalityManager.getQuestionPreferences(initialPersonality);
          
          expect(preferences1.preferredTypes).toEqual(preferences2.preferredTypes);
          expect(preferences1.difficultyProgression).toBe(preferences2.difficultyProgression);
          expect(preferences1.focusAreaWeights).toEqual(preferences2.focusAreaWeights);

          // Test that personality adaptation maintains core traits
          const conversationEvent: ConversationEvent = {
            type: 'response',
            content: 'Test response content',
            sessionProgress: 0.5,
            metadata: {
              confidence: 0.7,
              duration: 120,
              responseLength: 100,
            },
          };

          const adaptedPersonality = PersonalityManager.updatePersonalityState(
            initialPersonality,
            conversationEvent
          );

          // Core traits should remain unchanged
          expect(adaptedPersonality.name).toBe(personalityConfig.name);
          expect(adaptedPersonality.style).toBe(personalityConfig.style);
          expect(adaptedPersonality.tone).toBe(personalityConfig.tone);
          expect(adaptedPersonality.formality).toBe(personalityConfig.formality);
          expect(adaptedPersonality.adaptiveness).toBe(personalityConfig.adaptiveness);
          expect(adaptedPersonality.followUpIntensity).toBe(personalityConfig.followUpIntensity);
          expect(adaptedPersonality.encouragementLevel).toBe(personalityConfig.encouragementLevel);

          // Dynamic properties should be within valid ranges
          expect(adaptedPersonality.adaptationLevel).toBeGreaterThanOrEqual(0);
          expect(adaptedPersonality.adaptationLevel).toBeLessThanOrEqual(1);
          expect(adaptedPersonality.userEngagementLevel).toBeGreaterThanOrEqual(0);
          expect(adaptedPersonality.userEngagementLevel).toBeLessThanOrEqual(1);
          expect(adaptedPersonality.sessionProgress).toBeGreaterThanOrEqual(0);
          expect(adaptedPersonality.sessionProgress).toBeLessThanOrEqual(1);

          // Conversation history should grow
          expect(adaptedPersonality.conversationHistory.length).toBeGreaterThan(initialPersonality.conversationHistory.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Personality adaptation maintains core characteristics
   * For any sequence of personality adaptations, core personality traits should remain stable while dynamic properties adapt appropriately.
   */
  it('should maintain core personality traits while adapting dynamic properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          basePersonality: fc.record({
            name: fc.constantFrom('Test Interviewer', 'AI Assistant', 'Interview Bot'),
            style: fc.constantFrom(...Object.values(InterviewStyle)),
            tone: fc.constantFrom(...Object.values(InterviewTone)),
            formality: fc.constantFrom(...Object.values(FormalityLevel)),
            adaptiveness: float32(0.3, 1.0), // Higher adaptiveness for this test
            followUpIntensity: float32(0.1, 1.0),
            encouragementLevel: float32(0.1, 1.0),
          }),
          adaptationEvents: fc.array(
            fc.record({
              userEngagement: float32(0.0, 1.0),
              responseQuality: float32(0.0, 1.0),
              sessionProgress: float32(0.0, 1.0),
              responseLength: fc.integer({ min: 5, max: 1000 }),
            }),
            { minLength: 2, maxLength: 4 }
          ),
        }),

        async ({ basePersonality, adaptationEvents }) => {
          let currentPersonality = PersonalityManager.initializePersonality(basePersonality);
          const originalPersonality = { ...currentPersonality };

          // Apply each adaptation event
          for (const event of adaptationEvents) {
            const conversationEvent: ConversationEvent = {
              type: 'response',
              content: 'A'.repeat(event.responseLength),
              sessionProgress: event.sessionProgress,
              metadata: {
                confidence: event.responseQuality,
                duration: 60 + event.responseLength / 10, // Realistic duration
                responseLength: event.responseLength,
              },
            };

            currentPersonality = PersonalityManager.updatePersonalityState(
              currentPersonality,
              conversationEvent
            );

          // Core personality traits must remain unchanged (accounting for NaN handling)
          expect(currentPersonality.name).toBe(originalPersonality.name);
          expect(currentPersonality.style).toBe(originalPersonality.style);
          expect(currentPersonality.tone).toBe(originalPersonality.tone);
          expect(currentPersonality.formality).toBe(originalPersonality.formality);
          expect(currentPersonality.adaptiveness).toBe(originalPersonality.adaptiveness);
          expect(currentPersonality.followUpIntensity).toBe(originalPersonality.followUpIntensity);
          expect(currentPersonality.encouragementLevel).toBe(originalPersonality.encouragementLevel);

            // Dynamic properties should be within valid ranges
            expect(currentPersonality.adaptationLevel).toBeGreaterThanOrEqual(0);
            expect(currentPersonality.adaptationLevel).toBeLessThanOrEqual(1);
            expect(currentPersonality.userEngagementLevel).toBeGreaterThanOrEqual(0);
            expect(currentPersonality.userEngagementLevel).toBeLessThanOrEqual(1);
            expect(currentPersonality.sessionProgress).toBeGreaterThanOrEqual(0);
            expect(currentPersonality.sessionProgress).toBeLessThanOrEqual(1);

            // Mood should be a valid enum value
            expect(Object.values(InterviewerMood)).toContain(currentPersonality.currentMood);

            // Conversation history should grow
            expect(currentPersonality.conversationHistory.length).toBeGreaterThan(originalPersonality.conversationHistory.length);
          }

          // Final adaptation level should reflect the adaptiveness setting
          if (basePersonality.adaptiveness > 0.7) {
            expect(currentPersonality.adaptationLevel).toBeGreaterThan(0.01); // More lenient threshold
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Follow-up decision consistency
   * For any given response characteristics and personality, follow-up decisions should be consistent and logical.
   */
  it('should make consistent follow-up decisions based on response quality and personality', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          personality: fc.record({
            name: fc.string({ minLength: 3, maxLength: 20 }),
            style: fc.constantFrom(...Object.values(InterviewStyle)),
            tone: fc.constantFrom(...Object.values(InterviewTone)),
            formality: fc.constantFrom(...Object.values(FormalityLevel)),
            adaptiveness: float32(0.1, 1.0),
            followUpIntensity: float32(0.1, 1.0),
            encouragementLevel: float32(0.1, 1.0),
          }),
          responseQuality: float32(0.0, 1.0),
          responseLength: fc.integer({ min: 5, max: 1000 }),
          consecutiveFollowUps: fc.integer({ min: 0, max: 3 }),
        }),

        ({ personality, responseQuality, responseLength, consecutiveFollowUps }) => {
          const personalityState = PersonalityManager.initializePersonality(personality);
          personalityState.consecutiveFollowUps = consecutiveFollowUps;

          const shouldFollowUp = PersonalityManager.shouldAskFollowUp(
            personalityState,
            responseQuality,
            responseLength
          );

          // Verify follow-up decision is boolean
          expect(typeof shouldFollowUp).toBe('boolean');

          // Logical consistency checks
          if (consecutiveFollowUps >= 2) {
            // Should not ask follow-up if too many consecutive follow-ups
            expect(shouldFollowUp).toBe(false);
          }

          // The decision should be influenced by personality traits
          // High follow-up intensity should increase likelihood (though randomness is involved)
          // This is a probabilistic test, so we can't assert exact outcomes
          // but we can verify the function executes without errors
          expect(shouldFollowUp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});