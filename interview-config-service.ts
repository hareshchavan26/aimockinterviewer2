import {
  InterviewConfig,
  InterviewTemplate,
  InterviewSession,
  SessionResponse,
  CreateInterviewConfigRequest,
  UpdateInterviewConfigRequest,
  CreateSessionRequest,
  SessionControlRequest,
  SubmitResponseRequest,
  TemplateFilters,
  ValidationResult,
  InterviewConfigService,
  InterviewConfigRepository,
  ConfigNotFoundError,
  TemplateNotFoundError,
  SessionNotFoundError,
  InvalidSessionStateError,
  ConfigValidationError,
  UnauthorizedAccessError,
  SessionState,
  SessionAction,
} from '../types/interview-config';
import { ConfigValidator } from '../validation/config-validator';
import { logger } from '../utils/logger';

export class DefaultInterviewConfigService implements InterviewConfigService {
  constructor(private repository: InterviewConfigRepository) {}

  // Configuration management
  async createConfiguration(userId: string, configData: CreateInterviewConfigRequest): Promise<InterviewConfig> {
    try {
      // Validate the configuration data
      const validation = await ConfigValidator.validateCreateConfig(configData);
      if (!validation.isValid) {
        throw new ConfigValidationError('Configuration validation failed', validation.errors);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('Configuration created with warnings', {
          userId,
          warnings: validation.warnings,
        });
      }

      // Sanitize tags
      const sanitizedData = {
        ...configData,
        tags: configData.tags ? ConfigValidator.validateAndSanitizeTags(configData.tags) : [],
      };

      const config = await this.repository.createConfig(userId, sanitizedData);
      
      logger.info('Interview configuration created', {
        configId: config.id,
        userId,
        name: config.name,
        role: config.role,
        industry: config.industry,
      });

      return config;
    } catch (error) {
      logger.error('Failed to create interview configuration', {
        error,
        userId,
        configData: { ...configData, settings: '[REDACTED]' },
      });
      throw error;
    }
  }

  async getConfiguration(configId: string): Promise<InterviewConfig> {
    if (!ConfigValidator.isValidUUID(configId)) {
      throw new ConfigNotFoundError('Invalid configuration ID format');
    }

    const config = await this.repository.findConfigById(configId);
    if (!config) {
      throw new ConfigNotFoundError('Configuration not found', configId);
    }

    return config;
  }

  async getUserConfigurations(userId: string): Promise<InterviewConfig[]> {
    try {
      const configs = await this.repository.findConfigsByUserId(userId);
      
      logger.debug('Retrieved user configurations', {
        userId,
        count: configs.length,
      });

      return configs;
    } catch (error) {
      logger.error('Failed to retrieve user configurations', { error, userId });
      throw error;
    }
  }

  async updateConfiguration(configId: string, configData: UpdateInterviewConfigRequest): Promise<InterviewConfig> {
    try {
      // Validate the update data
      const validation = await ConfigValidator.validateUpdateConfig(configData);
      if (!validation.isValid) {
        throw new ConfigValidationError('Configuration validation failed', validation.errors);
      }

      // Check if configuration exists
      const existingConfig = await this.repository.findConfigById(configId);
      if (!existingConfig) {
        throw new ConfigNotFoundError('Configuration not found', configId);
      }

      // Sanitize tags if provided
      const sanitizedData = {
        ...configData,
        tags: configData.tags ? ConfigValidator.validateAndSanitizeTags(configData.tags) : undefined,
      };

      const updatedConfig = await this.repository.updateConfig(configId, sanitizedData);
      
      logger.info('Interview configuration updated', {
        configId,
        userId: existingConfig.userId,
        changes: Object.keys(configData),
      });

      return updatedConfig;
    } catch (error) {
      logger.error('Failed to update interview configuration', {
        error,
        configId,
        configData: { ...configData, settings: '[REDACTED]' },
      });
      throw error;
    }
  }

  async deleteConfiguration(configId: string): Promise<void> {
    try {
      // Check if configuration exists
      const existingConfig = await this.repository.findConfigById(configId);
      if (!existingConfig) {
        throw new ConfigNotFoundError('Configuration not found', configId);
      }

      await this.repository.deleteConfig(configId);
      
      logger.info('Interview configuration deleted', {
        configId,
        userId: existingConfig.userId,
        name: existingConfig.name,
      });
    } catch (error) {
      logger.error('Failed to delete interview configuration', { error, configId });
      throw error;
    }
  }

  // Template management
  async getTemplate(templateId: string): Promise<InterviewTemplate> {
    if (!ConfigValidator.isValidUUID(templateId)) {
      throw new TemplateNotFoundError('Invalid template ID format');
    }

    const template = await this.repository.findTemplateById(templateId);
    if (!template) {
      throw new TemplateNotFoundError('Template not found', templateId);
    }

    return template;
  }

  async searchTemplates(query?: string, filters?: TemplateFilters): Promise<InterviewTemplate[]> {
    try {
      const templates = await this.repository.searchTemplates(query || '', filters);
      
      logger.debug('Template search completed', {
        query,
        filters,
        resultCount: templates.length,
      });

      return templates;
    } catch (error) {
      logger.error('Failed to search templates', { error, query, filters });
      throw error;
    }
  }

  async getTemplatesByRole(role: string): Promise<InterviewTemplate[]> {
    try {
      const templates = await this.repository.findTemplatesByRole(role);
      
      logger.debug('Retrieved templates by role', {
        role,
        count: templates.length,
      });

      return templates;
    } catch (error) {
      logger.error('Failed to get templates by role', { error, role });
      throw error;
    }
  }

  async getTemplatesByIndustry(industry: string): Promise<InterviewTemplate[]> {
    try {
      const templates = await this.repository.findTemplatesByIndustry(industry);
      
      logger.debug('Retrieved templates by industry', {
        industry,
        count: templates.length,
      });

      return templates;
    } catch (error) {
      logger.error('Failed to get templates by industry', { error, industry });
      throw error;
    }
  }

  // Configuration validation
  async validateConfiguration(configData: CreateInterviewConfigRequest | UpdateInterviewConfigRequest): Promise<ValidationResult> {
    try {
      let validation: ValidationResult;
      
      if ('name' in configData && 'role' in configData && 'industry' in configData) {
        // This is a create request (has required fields)
        validation = await ConfigValidator.validateCreateConfig(configData as CreateInterviewConfigRequest);
      } else {
        // This is an update request
        validation = await ConfigValidator.validateUpdateConfig(configData as UpdateInterviewConfigRequest);
      }

      logger.debug('Configuration validation completed', {
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      });

      return validation;
    } catch (error) {
      logger.error('Failed to validate configuration', { error, configData });
      throw error;
    }
  }

  // Session management
  async createSession(userId: string, sessionData: CreateSessionRequest): Promise<InterviewSession> {
    try {
      // Validate session data
      const validation = ConfigValidator.validateCreateSession(sessionData);
      if (!validation.isValid) {
        throw new ConfigValidationError('Session validation failed', validation.errors);
      }

      // Check if configuration exists and user has access
      const config = await this.repository.findConfigById(sessionData.configId);
      if (!config) {
        throw new ConfigNotFoundError('Configuration not found', sessionData.configId);
      }

      if (config.userId !== userId) {
        throw new UnauthorizedAccessError('User does not have access to this configuration');
      }

      const session = await this.repository.createSession(userId, sessionData);
      
      logger.info('Interview session created', {
        sessionId: session.id,
        userId,
        configId: sessionData.configId,
        configName: config.name,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create interview session', {
        error,
        userId,
        sessionData,
      });
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<InterviewSession> {
    if (!ConfigValidator.isValidUUID(sessionId)) {
      throw new SessionNotFoundError('Invalid session ID format');
    }

    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new SessionNotFoundError('Session not found', sessionId);
    }

    return session;
  }

  async getUserSessions(userId: string): Promise<InterviewSession[]> {
    try {
      const sessions = await this.repository.findSessionsByUserId(userId);
      
      logger.debug('Retrieved user sessions', {
        userId,
        count: sessions.length,
      });

      return sessions;
    } catch (error) {
      logger.error('Failed to retrieve user sessions', { error, userId });
      throw error;
    }
  }

  async controlSession(sessionId: string, controlRequest: SessionControlRequest): Promise<InterviewSession> {
    try {
      // Validate control request
      const validation = ConfigValidator.validateSessionControl(controlRequest);
      if (!validation.isValid) {
        throw new ConfigValidationError('Session control validation failed', validation.errors);
      }

      // Get current session
      const session = await this.repository.findSessionById(sessionId);
      if (!session) {
        throw new SessionNotFoundError('Session not found', sessionId);
      }

      // Validate state transition
      this.validateStateTransition(session.state, controlRequest.action);

      // Apply state changes
      const updatedSession = await this.applySessionControl(session, controlRequest);
      
      logger.info('Session control applied', {
        sessionId,
        action: controlRequest.action,
        previousState: session.state,
        newState: updatedSession.state,
      });

      return updatedSession;
    } catch (error) {
      logger.error('Failed to control session', {
        error,
        sessionId,
        controlRequest,
      });
      throw error;
    }
  }

  // Response management
  async submitResponse(sessionId: string, responseData: SubmitResponseRequest): Promise<SessionResponse> {
    try {
      // Validate response data
      const validation = ConfigValidator.validateSubmitResponse(responseData);
      if (!validation.isValid) {
        throw new ConfigValidationError('Response validation failed', validation.errors);
      }

      // Check if session exists and is in valid state
      const session = await this.repository.findSessionById(sessionId);
      if (!session) {
        throw new SessionNotFoundError('Session not found', sessionId);
      }

      if (session.state !== SessionState.IN_PROGRESS) {
        throw new InvalidSessionStateError(
          'Cannot submit response for session not in progress',
          session.state,
          SessionAction.START // This is a bit of a hack, but we need some action
        );
      }

      const response = await this.repository.createResponse(sessionId, responseData);
      
      logger.info('Response submitted', {
        responseId: response.id,
        sessionId,
        questionId: responseData.questionId,
        hasText: !!responseData.textResponse,
        hasAudio: !!responseData.audioUrl,
        hasVideo: !!responseData.videoUrl,
      });

      return response;
    } catch (error) {
      logger.error('Failed to submit response', {
        error,
        sessionId,
        responseData: { ...responseData, textResponse: '[REDACTED]' },
      });
      throw error;
    }
  }

  async getSessionResponses(sessionId: string): Promise<SessionResponse[]> {
    try {
      // Check if session exists
      const session = await this.repository.findSessionById(sessionId);
      if (!session) {
        throw new SessionNotFoundError('Session not found', sessionId);
      }

      const responses = await this.repository.findResponsesBySessionId(sessionId);
      
      logger.debug('Retrieved session responses', {
        sessionId,
        count: responses.length,
      });

      return responses;
    } catch (error) {
      logger.error('Failed to retrieve session responses', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get session status with time limit information
   */
  async getSessionStatus(sessionId: string): Promise<{
    session: InterviewSession;
    timeStatus: {
      sessionTimeRemaining?: number;
      questionTimeRemaining?: number;
      sessionTimeExceeded: boolean;
      questionTimeExceeded: boolean;
    };
    progress: {
      currentQuestionIndex: number;
      totalQuestions: number;
      completedQuestions: number;
      skippedQuestions: number;
      progressPercentage: number;
    };
  }> {
    try {
      const session = await this.repository.findSessionById(sessionId);
      if (!session) {
        throw new SessionNotFoundError('Session not found', sessionId);
      }

      // Check time limits
      const sessionTimeCheck = this.checkTimeLimit(session);
      const questionTimeCheck = this.checkQuestionTimeLimit(session);

      // Calculate progress
      const responses = await this.repository.findResponsesBySessionId(sessionId);
      const completedQuestions = responses.filter(r => !r.isSkipped).length;
      const skippedQuestions = responses.filter(r => r.isSkipped).length + (session.metadata.skipCount || 0);
      const progressPercentage = session.questions.length > 0 ? 
        Math.round((responses.length / session.questions.length) * 100) : 0;

      return {
        session,
        timeStatus: {
          sessionTimeRemaining: sessionTimeCheck.timeRemaining,
          questionTimeRemaining: questionTimeCheck.timeRemaining,
          sessionTimeExceeded: sessionTimeCheck.exceeded,
          questionTimeExceeded: questionTimeCheck.exceeded,
        },
        progress: {
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.questions.length,
          completedQuestions,
          skippedQuestions,
          progressPercentage,
        },
      };
    } catch (error) {
      logger.error('Failed to get session status', { error, sessionId });
      throw error;
    }
  }

  // Private helper methods
  private validateStateTransition(currentState: SessionState, action: SessionAction): void {
    const validTransitions: Record<SessionState, SessionAction[]> = {
      [SessionState.CREATED]: [SessionAction.START, SessionAction.ABANDON],
      [SessionState.IN_PROGRESS]: [SessionAction.PAUSE, SessionAction.SKIP_QUESTION, SessionAction.END, SessionAction.ABANDON],
      [SessionState.PAUSED]: [SessionAction.RESUME, SessionAction.ABANDON],
      [SessionState.COMPLETED]: [], // No valid transitions from completed
      [SessionState.ABANDONED]: [], // No valid transitions from abandoned
      [SessionState.ERROR]: [SessionAction.ABANDON], // Only abandon from error state
    };

    const allowedActions = validTransitions[currentState] || [];
    if (!allowedActions.includes(action)) {
      throw new InvalidSessionStateError(
        `Cannot perform action '${action}' from state '${currentState}'`,
        currentState,
        action
      );
    }
  }

  /**
   * Check if session has exceeded time limits
   */
  private checkTimeLimit(session: InterviewSession): { exceeded: boolean; timeRemaining?: number } {
    const now = new Date();
    const config = session.config;
    
    // Check overall session time limit
    if (config.duration && session.startedAt) {
      const sessionDurationMs = config.duration * 60 * 1000; // Convert minutes to milliseconds
      const elapsedTime = now.getTime() - session.startedAt.getTime();
      
      // Subtract paused time if session was paused
      let pausedTime = 0;
      if (session.pausedAt && session.resumedAt) {
        pausedTime = session.resumedAt.getTime() - session.pausedAt.getTime();
      } else if (session.pausedAt && session.state === SessionState.PAUSED) {
        pausedTime = now.getTime() - session.pausedAt.getTime();
      }
      
      const activeTime = elapsedTime - pausedTime;
      const timeRemaining = sessionDurationMs - activeTime;
      
      if (timeRemaining <= 0) {
        return { exceeded: true, timeRemaining: 0 };
      }
      
      return { exceeded: false, timeRemaining: Math.floor(timeRemaining / 1000) }; // Return seconds
    }
    
    return { exceeded: false };
  }

  /**
   * Check if current question has exceeded time limit
   */
  private checkQuestionTimeLimit(session: InterviewSession): { exceeded: boolean; timeRemaining?: number } {
    if (session.currentQuestionIndex >= session.questions.length) {
      return { exceeded: false };
    }
    
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const config = session.config;
    
    // Use question-specific time limit or global setting
    const timeLimit = currentQuestion.timeLimit || config.settings.timePerQuestion;
    
    if (!timeLimit) {
      return { exceeded: false };
    }
    
    // Find when current question started (last response completion or session start)
    const responses = session.responses || [];
    const currentQuestionResponses = responses.filter(r => r.questionId === currentQuestion.id);
    
    let questionStartTime: Date;
    if (currentQuestionResponses.length > 0) {
      // Question already has responses, so it's been active
      questionStartTime = currentQuestionResponses[0].startedAt;
    } else if (session.currentQuestionIndex === 0) {
      // First question, use session start time
      questionStartTime = session.startedAt;
    } else {
      // Use the completion time of the previous response
      const previousResponses = responses.filter((_, index) => index < session.currentQuestionIndex);
      if (previousResponses.length > 0) {
        questionStartTime = previousResponses[previousResponses.length - 1].completedAt || previousResponses[previousResponses.length - 1].startedAt;
      } else {
        questionStartTime = session.startedAt;
      }
    }
    
    const now = new Date();
    const elapsedTime = now.getTime() - questionStartTime.getTime();
    const timeLimitMs = timeLimit * 1000; // Convert seconds to milliseconds
    const timeRemaining = timeLimitMs - elapsedTime;
    
    if (timeRemaining <= 0) {
      return { exceeded: true, timeRemaining: 0 };
    }
    
    return { exceeded: false, timeRemaining: Math.floor(timeRemaining / 1000) }; // Return seconds
  }

  /**
   * Enforce time limits and auto-advance session if needed
   */
  private async enforceTimeLimits(session: InterviewSession): Promise<InterviewSession> {
    // Check overall session time limit
    const sessionTimeCheck = this.checkTimeLimit(session);
    if (sessionTimeCheck.exceeded) {
      logger.info('Session time limit exceeded, auto-completing session', {
        sessionId: session.id,
        duration: session.duration,
        configDuration: session.config.duration,
      });
      
      return await this.repository.updateSession(session.id, {
        state: SessionState.COMPLETED,
        completedAt: new Date(),
        duration: Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000),
        metadata: {
          ...session.metadata,
          autoCompleted: true,
          reason: 'session_time_limit_exceeded',
        },
      });
    }
    
    // Check current question time limit
    const questionTimeCheck = this.checkQuestionTimeLimit(session);
    if (questionTimeCheck.exceeded && session.state === SessionState.IN_PROGRESS) {
      logger.info('Question time limit exceeded, auto-skipping question', {
        sessionId: session.id,
        questionIndex: session.currentQuestionIndex,
        questionId: session.questions[session.currentQuestionIndex]?.id,
      });
      
      // Auto-skip the current question
      const newQuestionIndex = session.currentQuestionIndex + 1;
      const updateData: Partial<InterviewSession> = {
        currentQuestionIndex: newQuestionIndex,
        metadata: {
          ...session.metadata,
          autoSkippedQuestions: [...(session.metadata.autoSkippedQuestions || []), session.currentQuestionIndex],
        },
      };
      
      // Check if we've reached the end
      if (newQuestionIndex >= session.questions.length) {
        updateData.state = SessionState.COMPLETED;
        updateData.completedAt = new Date();
        updateData.duration = Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000);
      }
      
      return await this.repository.updateSession(session.id, updateData);
    }
    
    return session;
  }

  private async applySessionControl(session: InterviewSession, controlRequest: SessionControlRequest): Promise<InterviewSession> {
    const now = new Date();
    const updateData: Partial<InterviewSession> = {
      metadata: {
        ...session.metadata,
        ...controlRequest.metadata,
      },
    };

    switch (controlRequest.action) {
      case SessionAction.START:
        updateData.state = SessionState.IN_PROGRESS;
        updateData.startedAt = now;
        
        // Initialize session metadata
        updateData.metadata = {
          ...updateData.metadata,
          sessionStarted: now.toISOString(),
          pauseCount: 0,
          skipCount: 0,
          autoSkippedQuestions: [],
          interruptions: session.metadata.interruptions || 0,
          technicalIssues: session.metadata.technicalIssues || [],
        };
        break;

      case SessionAction.PAUSE:
        // Check if pause is allowed
        if (!session.config.settings.allowPause) {
          throw new InvalidSessionStateError(
            'Pause is not allowed for this interview configuration',
            session.state,
            controlRequest.action
          );
        }
        
        updateData.state = SessionState.PAUSED;
        updateData.pausedAt = now;
        updateData.metadata = {
          ...updateData.metadata,
          pauseCount: (session.metadata.pauseCount || 0) + 1,
          lastPausedAt: now.toISOString(),
          interruptions: session.metadata.interruptions || 0,
          technicalIssues: session.metadata.technicalIssues || [],
        };
        break;

      case SessionAction.RESUME:
        updateData.state = SessionState.IN_PROGRESS;
        updateData.resumedAt = now;
        
        // Calculate total paused time
        const pausedDuration = session.pausedAt ? 
          Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000) : 0;
        
        updateData.metadata = {
          ...updateData.metadata,
          totalPausedTime: (session.metadata.totalPausedTime || 0) + pausedDuration,
          lastResumedAt: now.toISOString(),
          interruptions: session.metadata.interruptions || 0,
          technicalIssues: session.metadata.technicalIssues || [],
        };
        break;

      case SessionAction.SKIP_QUESTION:
        // Check if skip is allowed
        if (!session.config.settings.allowSkip) {
          throw new InvalidSessionStateError(
            'Skip is not allowed for this interview configuration',
            session.state,
            controlRequest.action
          );
        }
        
        // Record the skipped question
        const skippedQuestionId = session.questions[session.currentQuestionIndex]?.id;
        updateData.currentQuestionIndex = session.currentQuestionIndex + 1;
        updateData.metadata = {
          ...updateData.metadata,
          skipCount: (session.metadata.skipCount || 0) + 1,
          skippedQuestions: [...(session.metadata.skippedQuestions || []), {
            questionId: skippedQuestionId,
            questionIndex: session.currentQuestionIndex,
            skippedAt: now.toISOString(),
            reason: controlRequest.metadata?.reason || 'user_requested',
          }],
          interruptions: session.metadata.interruptions || 0,
          technicalIssues: session.metadata.technicalIssues || [],
        };
        
        // Check if we've reached the end
        if (updateData.currentQuestionIndex >= session.questions.length) {
          updateData.state = SessionState.COMPLETED;
          updateData.completedAt = now;
          updateData.duration = this.calculateSessionDuration(session, now);
        }
        break;

      case SessionAction.END:
        updateData.state = SessionState.COMPLETED;
        updateData.completedAt = now;
        updateData.duration = this.calculateSessionDuration(session, now);
        updateData.metadata = {
          ...updateData.metadata,
          endedAt: now.toISOString(),
          endReason: controlRequest.metadata?.reason || 'user_requested',
        };
        break;

      case SessionAction.ABANDON:
        updateData.state = SessionState.ABANDONED;
        updateData.completedAt = now;
        updateData.duration = this.calculateSessionDuration(session, now);
        updateData.metadata = {
          ...updateData.metadata,
          abandonedAt: now.toISOString(),
          abandonReason: controlRequest.metadata?.reason || 'user_requested',
        };
        break;

      default:
        throw new Error(`Unknown session action: ${controlRequest.action}`);
    }

    const updatedSession = await this.repository.updateSession(session.id, updateData);
    
    // Apply time limit enforcement after state change
    if (updatedSession.state === SessionState.IN_PROGRESS) {
      return await this.enforceTimeLimits(updatedSession);
    }
    
    return updatedSession;
  }

  /**
   * Calculate the actual session duration excluding paused time
   */
  private calculateSessionDuration(session: InterviewSession, endTime: Date): number {
    if (!session.startedAt) {
      return 0;
    }
    
    const totalElapsed = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);
    const totalPausedTime = session.metadata.totalPausedTime || 0;
    
    // If currently paused, add current pause duration
    let currentPauseDuration = 0;
    if (session.state === SessionState.PAUSED && session.pausedAt) {
      currentPauseDuration = Math.floor((endTime.getTime() - session.pausedAt.getTime()) / 1000);
    }
    
    return Math.max(0, totalElapsed - totalPausedTime - currentPauseDuration);
  }
}