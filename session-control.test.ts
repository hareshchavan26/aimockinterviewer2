import { DefaultInterviewConfigService } from '../services/interview-config-service';
import { DatabaseInterviewConfigRepository } from '../repositories/interview-config-repository';
import {
  InterviewSession,
  SessionState,
  SessionAction,
  CreateSessionRequest,
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

describe('Session Control Functionality', () => {
  const mockUserId = 'user-123';
  const mockConfigId = 'config-456';
  const mockSessionId = 'session-789';

  const mockConfig = {
    id: mockConfigId,
    userId: mockUserId,
    name: 'Test Interview',
    role: 'Software Engineer',
    industry: 'Technology',
    difficulty: DifficultyLevel.MID,
    duration: 60, // 60 minutes
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
      allowPause: true,
      allowSkip: true,
      showTimer: true,
      enableRecording: true,
      enableVideoRecording: false,
      enableRealTimeFeedback: false,
      questionRandomization: false,
      adaptiveDifficulty: false,
      timePerQuestion: 300, // 5 minutes per question
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
    id: mockSessionId,
    userId: mockUserId,
    configId: mockConfigId,
    config: mockConfig,
    state: SessionState.CREATED,
    currentQuestionIndex: 0,
    questions: [
      {
        id: 'q1',
        type: QuestionType.BEHAVIORAL,
        category: 'experience',
        difficulty: DifficultyLevel.MID,
        text: 'Tell me about a challenging project you worked on.',
        evaluationCriteria: [],
        tags: [],
        metadata: { usageCount: 0, version: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'q2',
        type: QuestionType.TECHNICAL,
        category: 'skills',
        difficulty: DifficultyLevel.MID,
        text: 'Explain the difference between REST and GraphQL.',
        timeLimit: 600, // 10 minutes
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
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session State Transitions', () => {
    it('should start a session successfully', async () => {
      const updatedSession = { ...mockSession, state: SessionState.IN_PROGRESS };
      mockRepository.findSessionById.mockResolvedValue(mockSession);
      mockRepository.updateSession.mockResolvedValue(updatedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.START,
      };

      const result = await service.controlSession(mockSessionId, controlRequest);

      expect(result.state).toBe(SessionState.IN_PROGRESS);
      expect(mockRepository.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          state: SessionState.IN_PROGRESS,
          startedAt: expect.any(Date),
        })
      );
    });

    it('should pause a session when allowed', async () => {
      const inProgressSession = { ...mockSession, state: SessionState.IN_PROGRESS };
      const pausedSession = { ...inProgressSession, state: SessionState.PAUSED };
      
      mockRepository.findSessionById.mockResolvedValue(inProgressSession);
      mockRepository.updateSession.mockResolvedValue(pausedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.PAUSE,
      };

      const result = await service.controlSession(mockSessionId, controlRequest);

      expect(result.state).toBe(SessionState.PAUSED);
      expect(mockRepository.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          state: SessionState.PAUSED,
          pausedAt: expect.any(Date),
        })
      );
    });

    it('should resume a paused session', async () => {
      const pausedSession = { 
        ...mockSession, 
        state: SessionState.PAUSED,
        pausedAt: new Date(Date.now() - 60000), // Paused 1 minute ago
        metadata: { ...mockSession.metadata, pauseCount: 1 }
      };
      const resumedSession = { ...pausedSession, state: SessionState.IN_PROGRESS };
      
      mockRepository.findSessionById.mockResolvedValue(pausedSession);
      mockRepository.updateSession.mockResolvedValue(resumedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.RESUME,
      };

      const result = await service.controlSession(mockSessionId, controlRequest);

      expect(result.state).toBe(SessionState.IN_PROGRESS);
      expect(mockRepository.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          state: SessionState.IN_PROGRESS,
          resumedAt: expect.any(Date),
        })
      );
    });

    it('should skip a question when allowed', async () => {
      const inProgressSession = { ...mockSession, state: SessionState.IN_PROGRESS };
      const skippedSession = { ...inProgressSession, currentQuestionIndex: 1 };
      
      mockRepository.findSessionById.mockResolvedValue(inProgressSession);
      mockRepository.updateSession.mockResolvedValue(skippedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.SKIP_QUESTION,
        metadata: { reason: 'user_requested' },
      };

      const result = await service.controlSession(mockSessionId, controlRequest);

      expect(result.currentQuestionIndex).toBe(1);
      expect(mockRepository.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          currentQuestionIndex: 1,
          metadata: expect.objectContaining({
            skipCount: 1,
            skippedQuestions: expect.arrayContaining([
              expect.objectContaining({
                questionId: 'q1',
                questionIndex: 0,
                reason: 'user_requested',
              }),
            ]),
          }),
        })
      );
    });

    it('should complete session when skipping last question', async () => {
      const lastQuestionSession = { 
        ...mockSession, 
        state: SessionState.IN_PROGRESS,
        currentQuestionIndex: 1 // On last question
      };
      const completedSession = { 
        ...lastQuestionSession, 
        state: SessionState.COMPLETED,
        currentQuestionIndex: 2 
      };
      
      mockRepository.findSessionById.mockResolvedValue(lastQuestionSession);
      mockRepository.updateSession.mockResolvedValue(completedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.SKIP_QUESTION,
      };

      const result = await service.controlSession(mockSessionId, controlRequest);

      expect(result.state).toBe(SessionState.COMPLETED);
      expect(result.currentQuestionIndex).toBe(2);
      expect(mockRepository.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          state: SessionState.COMPLETED,
          completedAt: expect.any(Date),
          duration: expect.any(Number),
        })
      );
    });

    it('should end a session successfully', async () => {
      const inProgressSession = { ...mockSession, state: SessionState.IN_PROGRESS };
      const endedSession = { ...inProgressSession, state: SessionState.COMPLETED };
      
      mockRepository.findSessionById.mockResolvedValue(inProgressSession);
      mockRepository.updateSession.mockResolvedValue(endedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.END,
        metadata: { reason: 'user_requested' },
      };

      const result = await service.controlSession(mockSessionId, controlRequest);

      expect(result.state).toBe(SessionState.COMPLETED);
      expect(mockRepository.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          state: SessionState.COMPLETED,
          completedAt: expect.any(Date),
          duration: expect.any(Number),
        })
      );
    });
  });

  describe('Session Control Restrictions', () => {
    it('should reject pause when not allowed in config', async () => {
      const restrictedConfig = { 
        ...mockConfig, 
        settings: { ...mockConfig.settings, allowPause: false } 
      };
      const restrictedSession = { 
        ...mockSession, 
        config: restrictedConfig,
        state: SessionState.IN_PROGRESS 
      };
      
      mockRepository.findSessionById.mockResolvedValue(restrictedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.PAUSE,
      };

      await expect(service.controlSession(mockSessionId, controlRequest))
        .rejects.toThrow('Pause is not allowed for this interview configuration');
    });

    it('should reject skip when not allowed in config', async () => {
      const restrictedConfig = { 
        ...mockConfig, 
        settings: { ...mockConfig.settings, allowSkip: false } 
      };
      const restrictedSession = { 
        ...mockSession, 
        config: restrictedConfig,
        state: SessionState.IN_PROGRESS 
      };
      
      mockRepository.findSessionById.mockResolvedValue(restrictedSession);

      const controlRequest: SessionControlRequest = {
        action: SessionAction.SKIP_QUESTION,
      };

      await expect(service.controlSession(mockSessionId, controlRequest))
        .rejects.toThrow('Skip is not allowed for this interview configuration');
    });
  });

  describe('Session Status', () => {
    it('should return comprehensive session status', async () => {
      const inProgressSession = { 
        ...mockSession, 
        state: SessionState.IN_PROGRESS,
        startedAt: new Date(Date.now() - 60000), // Started 1 minute ago (within time limits)
      };
      
      mockRepository.findSessionById.mockResolvedValue(inProgressSession);
      mockRepository.findResponsesBySessionId.mockResolvedValue([]);

      const status = await service.getSessionStatus(mockSessionId);

      expect(status).toEqual({
        session: inProgressSession,
        timeStatus: expect.objectContaining({
          sessionTimeExceeded: false,
          questionTimeExceeded: false,
          sessionTimeRemaining: expect.any(Number),
          questionTimeRemaining: expect.any(Number),
        }),
        progress: expect.objectContaining({
          currentQuestionIndex: 0,
          totalQuestions: 2,
          completedQuestions: 0,
          skippedQuestions: 0,
          progressPercentage: 0,
        }),
      });
    });
  });
});