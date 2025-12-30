import { Request, Response } from 'express';
import {
  InterviewConfigService,
  CreateSessionRequest,
  SessionControlRequest,
  SubmitResponseRequest,
  InterviewConfigError,
  SessionNotFoundError,
  InvalidSessionStateError,
  ConfigValidationError,
  UnauthorizedAccessError,
  InterviewSession,
} from '../types/interview-config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export class SessionController {
  constructor(private configService: InterviewConfigService) {}

  // Session management endpoints
  async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const sessionData: CreateSessionRequest = req.body;
      const session = await this.configService.createSession(userId, sessionData);

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const session = await this.configService.getSession(sessionId);

      // Check ownership (simplified - in real app, this would be middleware)
      if (req.userId && session.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getUserSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || req.params.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const sessions = await this.configService.getUserSessions(userId);

      res.json({
        success: true,
        data: sessions,
        count: sessions.length,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async controlSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const controlRequest: SessionControlRequest = req.body;

      // Check ownership
      const existingSession = await this.configService.getSession(sessionId);
      if (req.userId && existingSession.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      const updatedSession = await this.configService.controlSession(sessionId, controlRequest);

      res.json({
        success: true,
        data: updatedSession,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // Response management endpoints
  async submitResponse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const responseData: SubmitResponseRequest = req.body;

      // Check ownership
      const session = await this.configService.getSession(sessionId);
      if (req.userId && session.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      const response = await this.configService.submitResponse(sessionId, responseData);

      res.status(201).json({
        success: true,
        data: response,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getSessionResponses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Check ownership
      const session = await this.configService.getSession(sessionId);
      if (req.userId && session.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      const responses = await this.configService.getSessionResponses(sessionId);

      res.json({
        success: true,
        data: responses,
        count: responses.length,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // Utility endpoints
  async getSessionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      // Get comprehensive session status
      const statusData = await this.configService.getSessionStatus(sessionId);
      const { session, timeStatus, progress } = statusData;

      // Check ownership
      if (req.userId && session.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          state: session.state,
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.questions.length,
          duration: session.duration,
          startedAt: session.startedAt,
          pausedAt: session.pausedAt,
          resumedAt: session.resumedAt,
          completedAt: session.completedAt,
          
          // Progress information
          progress: {
            ...progress,
            canPause: session.config.settings.allowPause && session.state === 'in_progress',
            canSkip: session.config.settings.allowSkip && session.state === 'in_progress',
            canResume: session.state === 'paused',
          },
          
          // Time limit information
          timeStatus: {
            ...timeStatus,
            sessionDurationLimit: session.config.duration ? session.config.duration * 60 : null, // Convert to seconds
            questionTimeLimit: session.questions[session.currentQuestionIndex]?.timeLimit || 
                              session.config.settings.timePerQuestion || null,
          },
          
          // Session metadata
          metadata: {
            pauseCount: session.metadata.pauseCount || 0,
            skipCount: session.metadata.skipCount || 0,
            totalPausedTime: session.metadata.totalPausedTime || 0,
            autoSkippedQuestions: session.metadata.autoSkippedQuestions || [],
            skippedQuestions: session.metadata.skippedQuestions || [],
          },
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getCurrentQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const session = await this.configService.getSession(sessionId);

      // Check ownership
      if (req.userId && session.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      if (session.currentQuestionIndex >= session.questions.length) {
        res.status(404).json({
          error: 'No more questions available',
          code: 'NO_MORE_QUESTIONS',
        });
        return;
      }

      const currentQuestion = session.questions[session.currentQuestionIndex];

      res.json({
        success: true,
        data: {
          question: currentQuestion,
          questionIndex: session.currentQuestionIndex,
          totalQuestions: session.questions.length,
          progress: Math.round((session.currentQuestionIndex / session.questions.length) * 100),
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Check and enforce time limits for a session
   */
  async checkTimeLimits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      // Get current session status with time information
      const statusData = await this.configService.getSessionStatus(sessionId);
      const { session, timeStatus } = statusData;

      // Check ownership
      if (req.userId && session.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      // If time limits are exceeded, the service will have already updated the session
      // Return the current time status
      res.json({
        success: true,
        data: {
          sessionId: session.id,
          state: session.state,
          timeStatus,
          warnings: this.generateTimeWarnings(timeStatus, session),
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Generate time-based warnings for the client
   */
  private generateTimeWarnings(timeStatus: any, session: InterviewSession): string[] {
    const warnings: string[] = [];
    
    // Session time warnings
    if (timeStatus.sessionTimeRemaining !== undefined) {
      const remainingMinutes = Math.floor(timeStatus.sessionTimeRemaining / 60);
      const warningThresholds = session.config.settings.notifications?.warningThresholds || [75, 90];
      const totalDuration = session.config.duration * 60; // Convert to seconds
      const elapsedPercentage = ((totalDuration - timeStatus.sessionTimeRemaining) / totalDuration) * 100;
      
      for (const threshold of warningThresholds) {
        if (elapsedPercentage >= threshold && remainingMinutes > 0) {
          warnings.push(`${remainingMinutes} minutes remaining in interview`);
          break;
        }
      }
      
      if (remainingMinutes <= 1 && timeStatus.sessionTimeRemaining > 0) {
        warnings.push('Less than 1 minute remaining in interview');
      }
    }
    
    // Question time warnings
    if (timeStatus.questionTimeRemaining !== undefined) {
      const remainingSeconds = timeStatus.questionTimeRemaining;
      
      if (remainingSeconds <= 30 && remainingSeconds > 0) {
        warnings.push(`${remainingSeconds} seconds remaining for current question`);
      }
    }
    
    return warnings;
  }

  private handleError(error: any, res: Response): void {
    logger.error('Session controller error', { error });

    if (error instanceof ConfigValidationError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
        validationErrors: error.validationErrors,
      });
    } else if (error instanceof SessionNotFoundError) {
      res.status(404).json({
        error: error.message,
        code: error.code,
      });
    } else if (error instanceof InvalidSessionStateError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
        currentState: error.currentState,
        requestedAction: error.requestedAction,
      });
    } else if (error instanceof UnauthorizedAccessError) {
      res.status(403).json({
        error: error.message,
        code: error.code,
      });
    } else if (error instanceof InterviewConfigError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}