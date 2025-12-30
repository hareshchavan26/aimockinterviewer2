import * as fc from 'fast-check';
import { DefaultInterviewConfigService } from '../services/interview-config-service';
import {
  InterviewSession,
  SessionState,
  SessionAction,
  SessionControlRequest,
  DifficultyLevel,
  QuestionType,
  FocusArea,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
} from '../types/interview-config';

// Mock the repository
const mockRepository = {
  createSession: jest.fn(),
  findSessionById: jest.fn(),
  updateSession: jest.fn(),
  findResponsesBySessionId: jest.fn(),
} as any;

const service = new DefaultInterviewConfigService(mockRepository);

describe('Session Control Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 7: Interview Session Control
   * For any session control operation (pause, resume, skip), the session state should update correctly and maintain consistency.
   * **Validates: Requirements 3.4, 3.5**
   * **Feature: ai-mock-interview-platform, Property 7: Interview Session Control**
   */
  it('should maintain session state consistency across all valid control operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid session states and corresponding valid actions
        fc.record({
          initialState: fc.constantFrom(
            SessionState.CREATED,
            SessionState.IN_PROGRESS,
            SessionState.PAUSED
          ),
          action: fc.constantFrom(
            SessionAction.START,
            SessionAction.PAUSE,
            SessionAction.RESUME,
            SessionAction.SKIP_QUESTION,
            SessionAction.END,
            SessionAction.ABANDON
          ),
          allowPause: fc.boolean(),
          allowSkip: fc.boolean(),
          currentQuestionIndex: fc.integer({ min: 0, max: 4 }),
          totalQuestions: fc.integer({ min: 1, max: 5 }),
          sessionId: fc.uuid(),
          userId: fc.uuid(),
          configId: fc.uuid(),
        }).filter(({ initialState, action, currentQuestionIndex, totalQuestions }) => {
          // Filter to only valid state transitions
          const validTransitions: Record<SessionState, SessionAction[]> = {
            [SessionState.CREATED]: [SessionAction.START, SessionAction.ABANDON],
            [SessionState.IN_PROGRESS]: [SessionAction.PAUSE, SessionAction.SKIP_QUESTION, SessionAction.END, SessionAction.ABANDON],
            [SessionState.PAUSED]: [SessionAction.RESUME, SessionAction.ABANDON],
            [SessionState.COMPLETED]: [],
            [SessionState.ABANDONED]: [],
            [SessionState.ERROR]: [SessionAction.ABANDON],
          };
          
          const isValidTransition = validTransitions[initialState]?.includes(action) || false;
          const isValidQuestionIndex = currentQuestionIndex < totalQuestions;
          
          return isValidTransition && isValidQuestionIndex;
        }),
        
        async ({ initialState, action, allowPause, allowSkip, currentQuestionIndex, totalQuestions, sessionId, userId, configId }) => {
          // Create a mock session with the generated properties
          const mockConfig = {
            id: configId,
            userId,
            name: 'Test Interview',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.MID,
            duration: 60,
            questionTypes: [QuestionType.BEHAVIORAL, QuestionType.TECHNICAL],
            focusAreas: [FocusArea.TECHNICAL_SKILLS, FocusArea.COMMUNICATION],
            aiPersonality: {
              name: 'Professional Interviewer',
              style: InterviewStyle.FORMAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.SEMI_FORMAL,
              adaptiveness: 0.7,
              followUpIntensity: 0.6,
              encouragementLevel: 0.8,
            },
            settings: {
              allowPause,
              allowSkip,
              showTimer: true,
              enableRecording: true,
              enableVideoRecording: false,
              enableRealTimeFeedback: false,
              questionRandomization: false,
              adaptiveDifficulty: false,
              timePerQuestion: 300,
              breaksBetweenQuestions: 5,
              notifications: {
                timeWarnings: true,
                warningThresholds: [75, 90],
                soundEnabled: true,
                vibrationEnabled: false,
              },
            },
            isTemplate: false,
            isPublic: false,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Generate questions array
          const questions = Array.from({ length: totalQuestions }, (_, index) => ({
            id: `q${index + 1}`,
            type: QuestionType.BEHAVIORAL,
            category: 'experience',
            difficulty: DifficultyLevel.MID,
            text: `Question ${index + 1}`,
            evaluationCriteria: [],
            tags: [],
            metadata: { usageCount: 0, version: 1 },
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const mockSession: InterviewSession = {
            id: sessionId,
            userId,
            configId,
            config: mockConfig,
            state: initialState,
            currentQuestionIndex,
            questions,
            responses: [],
            startedAt: new Date(Date.now() - 60000), // Always set a valid Date
            pausedAt: initialState === SessionState.PAUSED ? new Date(Date.now() - 30000) : undefined,
            resumedAt: undefined,
            duration: 0,
            metadata: {
              interruptions: 0,
              technicalIssues: [],
              pauseCount: initialState === SessionState.PAUSED ? 1 : 0,
              skipCount: 0,
              totalPausedTime: 0,
              autoSkippedQuestions: [],
              skippedQuestions: [],
            },
          };

          const controlRequest: SessionControlRequest = {
            action,
            metadata: { reason: 'property_test' },
          };

          // Set up mock repository responses
          mockRepository.findSessionById.mockResolvedValue(mockSession);
          mockRepository.findResponsesBySessionId.mockResolvedValue([]);

          // Calculate expected state after the action
          let expectedState = initialState;
          let expectedQuestionIndex = currentQuestionIndex;
          let shouldHaveTimestamp = false;

          switch (action) {
            case SessionAction.START:
              expectedState = SessionState.IN_PROGRESS;
              shouldHaveTimestamp = true;
              break;
            case SessionAction.PAUSE:
              if (allowPause) {
                expectedState = SessionState.PAUSED;
                shouldHaveTimestamp = true;
              }
              break;
            case SessionAction.RESUME:
              expectedState = SessionState.IN_PROGRESS;
              shouldHaveTimestamp = true;
              break;
            case SessionAction.SKIP_QUESTION:
              if (allowSkip) {
                expectedQuestionIndex = currentQuestionIndex + 1;
                if (expectedQuestionIndex >= totalQuestions) {
                  expectedState = SessionState.COMPLETED;
                  shouldHaveTimestamp = true;
                }
              }
              break;
            case SessionAction.END:
              expectedState = SessionState.COMPLETED;
              shouldHaveTimestamp = true;
              break;
            case SessionAction.ABANDON:
              expectedState = SessionState.ABANDONED;
              shouldHaveTimestamp = true;
              break;
          }

          // Create the expected updated session
          const expectedUpdatedSession = {
            ...mockSession,
            state: expectedState,
            currentQuestionIndex: expectedQuestionIndex,
            startedAt: action === SessionAction.START ? new Date() : mockSession.startedAt,
            ...(shouldHaveTimestamp && { completedAt: new Date() }),
            ...(action === SessionAction.PAUSE && allowPause && { pausedAt: new Date() }),
            ...(action === SessionAction.RESUME && { resumedAt: new Date() }),
            metadata: {
              ...mockSession.metadata,
              ...(action === SessionAction.PAUSE && allowPause && { pauseCount: (mockSession.metadata.pauseCount || 0) + 1 }),
              ...(action === SessionAction.SKIP_QUESTION && allowSkip && { 
                skipCount: (mockSession.metadata.skipCount || 0) + 1,
                skippedQuestions: [...(mockSession.metadata.skippedQuestions || []), {
                  questionId: mockSession.questions[currentQuestionIndex]?.id,
                  questionIndex: currentQuestionIndex,
                  skippedAt: new Date().toISOString(),
                  reason: 'property_test',
                }]
              }),
            },
          };

          mockRepository.updateSession.mockResolvedValue(expectedUpdatedSession);

          try {
            // Execute the session control operation
            const result = await service.controlSession(sessionId, controlRequest);

            // Verify the result matches expected state
            expect(result.state).toBe(expectedState);
            expect(result.currentQuestionIndex).toBe(expectedQuestionIndex);

            // Verify repository was called to find the session
            expect(mockRepository.findSessionById).toHaveBeenCalledWith(sessionId);
            
            // Verify that updateSession was called at least once (the service may call it multiple times due to time enforcement)
            expect(mockRepository.updateSession).toHaveBeenCalled();

          } catch (error) {
            // For actions that should be rejected due to configuration
            if ((action === SessionAction.PAUSE && !allowPause) || 
                (action === SessionAction.SKIP_QUESTION && !allowSkip)) {
              expect(error.message).toMatch(/not allowed/);
              // Note: We don't check repository calls here because the service may still call
              // findSessionById and potentially other methods before throwing the error
            } else {
              throw error; // Re-throw unexpected errors
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Session control operations preserve session identity
   * For any valid session control operation, the session ID and user ID should remain unchanged.
   */
  it('should preserve session identity across all control operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          userId: fc.uuid(),
          configId: fc.uuid(),
          action: fc.constantFrom(
            SessionAction.START,
            SessionAction.PAUSE,
            SessionAction.RESUME,
            SessionAction.END,
            SessionAction.ABANDON
          ),
          initialState: fc.constantFrom(
            SessionState.CREATED,
            SessionState.IN_PROGRESS,
            SessionState.PAUSED
          ),
        }).filter(({ initialState, action }) => {
          // Only test valid transitions
          const validTransitions: Record<SessionState, SessionAction[]> = {
            [SessionState.CREATED]: [SessionAction.START, SessionAction.ABANDON],
            [SessionState.IN_PROGRESS]: [SessionAction.PAUSE, SessionAction.END, SessionAction.ABANDON],
            [SessionState.PAUSED]: [SessionAction.RESUME, SessionAction.ABANDON],
            [SessionState.COMPLETED]: [],
            [SessionState.ABANDONED]: [],
            [SessionState.ERROR]: [SessionAction.ABANDON],
          };
          
          return validTransitions[initialState]?.includes(action) || false;
        }),

        async ({ sessionId, userId, configId, action, initialState }) => {
          const mockConfig = {
            id: configId,
            userId,
            name: 'Test Interview',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.MID,
            duration: 60,
            questionTypes: [QuestionType.BEHAVIORAL],
            focusAreas: [FocusArea.COMMUNICATION],
            aiPersonality: {
              name: 'Professional Interviewer',
              style: InterviewStyle.FORMAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.SEMI_FORMAL,
              adaptiveness: 0.7,
              followUpIntensity: 0.6,
              encouragementLevel: 0.8,
            },
            settings: {
              allowPause: true,
              allowSkip: true,
              showTimer: true,
              enableRecording: true,
              enableVideoRecording: false,
              enableRealTimeFeedback: false,
              questionRandomization: false,
              adaptiveDifficulty: false,
              timePerQuestion: 300,
              breaksBetweenQuestions: 5,
              notifications: {
                timeWarnings: true,
                warningThresholds: [75, 90],
                soundEnabled: true,
                vibrationEnabled: false,
              },
            },
            isTemplate: false,
            isPublic: false,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockSession: InterviewSession = {
            id: sessionId,
            userId,
            configId,
            config: mockConfig,
            state: initialState,
            currentQuestionIndex: 0,
            questions: [{
              id: 'q1',
              type: QuestionType.BEHAVIORAL,
              category: 'experience',
              difficulty: DifficultyLevel.MID,
              text: 'Test question',
              evaluationCriteria: [],
              tags: [],
              metadata: { usageCount: 0, version: 1 },
              createdAt: new Date(),
              updatedAt: new Date(),
            }],
            responses: [],
            startedAt: new Date(),
            duration: 0,
            metadata: {
              interruptions: 0,
              technicalIssues: [],
            },
          };

          const controlRequest: SessionControlRequest = {
            action,
            metadata: { reason: 'identity_test' },
          };

          const updatedSession = { ...mockSession, state: SessionState.IN_PROGRESS };

          mockRepository.findSessionById.mockResolvedValue(mockSession);
          mockRepository.updateSession.mockResolvedValue(updatedSession);
          mockRepository.findResponsesBySessionId.mockResolvedValue([]);

          const result = await service.controlSession(sessionId, controlRequest);

          // Verify identity preservation
          expect(result.id).toBe(sessionId);
          expect(result.userId).toBe(userId);
          expect(result.configId).toBe(configId);
          expect(result.config.id).toBe(configId);
          expect(result.config.userId).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Session metadata accumulates correctly
   * For any sequence of pause/resume operations, the metadata should correctly track counts and timing.
   */
  it('should correctly accumulate session metadata across control operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionId: fc.uuid(),
          userId: fc.uuid(),
          configId: fc.uuid(),
          initialPauseCount: fc.integer({ min: 0, max: 5 }),
          initialSkipCount: fc.integer({ min: 0, max: 3 }),
          action: fc.constantFrom(SessionAction.PAUSE, SessionAction.SKIP_QUESTION),
        }),

        async ({ sessionId, userId, configId, initialPauseCount, initialSkipCount, action }) => {
          const mockConfig = {
            id: configId,
            userId,
            name: 'Test Interview',
            role: 'Software Engineer',
            industry: 'Technology',
            difficulty: DifficultyLevel.MID,
            duration: 60,
            questionTypes: [QuestionType.BEHAVIORAL],
            focusAreas: [FocusArea.COMMUNICATION],
            aiPersonality: {
              name: 'Professional Interviewer',
              style: InterviewStyle.FORMAL,
              tone: InterviewTone.PROFESSIONAL,
              formality: FormalityLevel.SEMI_FORMAL,
              adaptiveness: 0.7,
              followUpIntensity: 0.6,
              encouragementLevel: 0.8,
            },
            settings: {
              allowPause: true,
              allowSkip: true,
              showTimer: true,
              enableRecording: true,
              enableVideoRecording: false,
              enableRealTimeFeedback: false,
              questionRandomization: false,
              adaptiveDifficulty: false,
              timePerQuestion: 300,
              breaksBetweenQuestions: 5,
              notifications: {
                timeWarnings: true,
                warningThresholds: [75, 90],
                soundEnabled: true,
                vibrationEnabled: false,
              },
            },
            isTemplate: false,
            isPublic: false,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockSession: InterviewSession = {
            id: sessionId,
            userId,
            configId,
            config: mockConfig,
            state: SessionState.IN_PROGRESS,
            currentQuestionIndex: 0,
            questions: [
              {
                id: 'q1',
                type: QuestionType.BEHAVIORAL,
                category: 'experience',
                difficulty: DifficultyLevel.MID,
                text: 'Test question 1',
                evaluationCriteria: [],
                tags: [],
                metadata: { usageCount: 0, version: 1 },
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'q2',
                type: QuestionType.BEHAVIORAL,
                category: 'experience',
                difficulty: DifficultyLevel.MID,
                text: 'Test question 2',
                evaluationCriteria: [],
                tags: [],
                metadata: { usageCount: 0, version: 1 },
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            responses: [],
            startedAt: new Date(),
            duration: 0,
            metadata: {
              interruptions: 0,
              technicalIssues: [],
              pauseCount: initialPauseCount,
              skipCount: initialSkipCount,
              totalPausedTime: 0,
              autoSkippedQuestions: [],
              skippedQuestions: [],
            },
          };

          const controlRequest: SessionControlRequest = {
            action,
            metadata: { reason: 'metadata_test' },
          };

          // Calculate expected metadata changes
          const expectedPauseCount = action === SessionAction.PAUSE ? initialPauseCount + 1 : initialPauseCount;
          const expectedSkipCount = action === SessionAction.SKIP_QUESTION ? initialSkipCount + 1 : initialSkipCount;

          const updatedSession = {
            ...mockSession,
            state: action === SessionAction.PAUSE ? SessionState.PAUSED : SessionState.IN_PROGRESS,
            currentQuestionIndex: action === SessionAction.SKIP_QUESTION ? 1 : 0,
            metadata: {
              ...mockSession.metadata,
              pauseCount: expectedPauseCount,
              skipCount: expectedSkipCount,
              ...(action === SessionAction.SKIP_QUESTION && {
                skippedQuestions: [{
                  questionId: 'q1',
                  questionIndex: 0,
                  skippedAt: expect.any(String),
                  reason: 'metadata_test',
                }],
              }),
            },
          };

          mockRepository.findSessionById.mockResolvedValue(mockSession);
          mockRepository.updateSession.mockResolvedValue(updatedSession);
          mockRepository.findResponsesBySessionId.mockResolvedValue([]);

          const result = await service.controlSession(sessionId, controlRequest);

          // Verify metadata accumulation
          if (action === SessionAction.PAUSE) {
            expect(mockRepository.updateSession).toHaveBeenCalledWith(
              sessionId,
              expect.objectContaining({
                metadata: expect.objectContaining({
                  pauseCount: expectedPauseCount,
                }),
              })
            );
          }

          if (action === SessionAction.SKIP_QUESTION) {
            expect(mockRepository.updateSession).toHaveBeenCalledWith(
              sessionId,
              expect.objectContaining({
                metadata: expect.objectContaining({
                  skipCount: expectedSkipCount,
                  skippedQuestions: expect.arrayContaining([
                    expect.objectContaining({
                      questionId: 'q1',
                      questionIndex: 0,
                      reason: 'metadata_test',
                    }),
                  ]),
                }),
              })
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});