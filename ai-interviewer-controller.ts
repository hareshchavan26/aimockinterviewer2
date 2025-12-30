import { Request, Response } from 'express';
import { DefaultAIInterviewerService } from '../services/ai-interviewer-service';
import { TechnicalEvaluationService } from '../services/technical-evaluation-service';
import { PersonalityManager, ConversationEvent } from '../services/personality-manager';
import {
  QuestionGenerationContext,
  FollowUpContext,
  ResponseEvaluationContext,
  TechnicalEvaluationContext,
  DifficultyAdaptationContext,
  PersonalityAdaptationContext,
  AIPersonalityState,
  DifficultyLevel,
  QuestionGenerationError,
  ResponseEvaluationError,
  TechnicalEvaluationError,
  DifficultyAdaptationError,
  PersonalityAdaptationError,
} from '../types/ai-interviewer';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export class AIInterviewerController {
  private technicalEvaluationService: TechnicalEvaluationService;

  constructor(private aiService: DefaultAIInterviewerService) {
    this.technicalEvaluationService = new TechnicalEvaluationService();
  }

  /**
   * Generate a new interview question
   */
  async generateQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const context: QuestionGenerationContext = req.body;
      
      // Validate required fields
      if (!context.sessionId || !context.interviewConfig) {
        res.status(400).json({
          error: 'Missing required fields: sessionId, interviewConfig',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const question = await this.aiService.generateQuestion(context);

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Generate a follow-up question based on user response
   */
  async generateFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const context: FollowUpContext = req.body;
      
      // Validate required fields
      if (!context.sessionId || !context.originalQuestion || !context.userResponse) {
        res.status(400).json({
          error: 'Missing required fields: sessionId, originalQuestion, userResponse',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const followUpQuestion = await this.aiService.generateFollowUpQuestion(context);

      res.status(201).json({
        success: true,
        data: followUpQuestion,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Evaluate a user's response to a question
   */
  async evaluateResponse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const context: ResponseEvaluationContext = req.body;
      
      // Validate required fields
      if (!context.sessionId || !context.question || !context.userResponse) {
        res.status(400).json({
          error: 'Missing required fields: sessionId, question, userResponse',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const evaluation = await this.aiService.evaluateResponse(context);

      res.json({
        success: true,
        data: evaluation,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Evaluate a technical response with role-specific criteria
   */
  async evaluateTechnicalResponse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { sessionId, question, userResponse, role, industry, expectedSolution, personalityState } = req.body;
      
      // Validate required fields
      if (!sessionId || !question || !userResponse || !role || !industry) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: sessionId, question, userResponse, role, industry',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      // Get role-specific criteria
      const roleSpecificCriteria = this.technicalEvaluationService.getRoleSpecificCriteria(role, industry);
      const technicalDomain = this.technicalEvaluationService.getTechnicalDomainForRole(role);

      const context: TechnicalEvaluationContext = {
        sessionId,
        question,
        userResponse,
        roleSpecificCriteria,
        technicalDomain,
        expectedSolution,
        personalityState,
      };

      const evaluation = await this.aiService.evaluateTechnicalResponse(context);

      res.json({
        success: true,
        data: evaluation,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Adapt difficulty level based on performance metrics
   */
  async adaptDifficulty(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const context: DifficultyAdaptationContext = req.body;
      
      // Validate required fields
      if (!context.sessionId || !context.performanceMetrics || !context.currentDifficulty) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: sessionId, performanceMetrics, currentDifficulty',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const adaptedDifficulty = await this.aiService.adaptDifficulty(context);

      res.json({
        success: true,
        data: {
          previousDifficulty: context.currentDifficulty,
          adaptedDifficulty,
          reasoning: this.getDifficultyAdaptationReasoning(context.currentDifficulty, adaptedDifficulty, context.performanceMetrics),
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get role-specific evaluation criteria
   */
  async getRoleSpecificCriteria(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { role, industry } = req.query;
      
      if (!role || !industry) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameters: role, industry',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const criteria = this.technicalEvaluationService.getRoleSpecificCriteria(
        role as string,
        industry as string
      );

      res.json({
        success: true,
        data: criteria,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get technical domain for a specific role
   */
  async getTechnicalDomain(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { role } = req.query;
      
      if (!role) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: role',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const technicalDomain = this.technicalEvaluationService.getTechnicalDomainForRole(role as string);

      res.json({
        success: true,
        data: {
          role,
          technicalDomain,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Adapt AI personality based on session progress
   */
  async adaptPersonality(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const context: PersonalityAdaptationContext = req.body;
      
      // Validate required fields
      if (!context.sessionId || !context.currentPersonality) {
        res.status(400).json({
          error: 'Missing required fields: sessionId, currentPersonality',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const adaptedPersonality = await this.aiService.adaptPersonality(context);

      res.json({
        success: true,
        data: adaptedPersonality,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Initialize AI personality for a new session
   */
  async initializePersonality(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { personalityConfig } = req.body;
      
      if (!personalityConfig) {
        res.status(400).json({
          error: 'Missing required field: personalityConfig',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const initialPersonality = PersonalityManager.initializePersonality(personalityConfig);

      res.status(201).json({
        success: true,
        data: initialPersonality,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update personality state based on conversation events
   */
  async updatePersonalityState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { currentState, event } = req.body;
      
      if (!currentState || !event) {
        res.status(400).json({
          error: 'Missing required fields: currentState, event',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const updatedState = PersonalityManager.updatePersonalityState(
        currentState as AIPersonalityState,
        event as ConversationEvent
      );

      res.json({
        success: true,
        data: updatedState,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get personality-appropriate response style
   */
  async getResponseStyle(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { personality } = req.body;
      
      if (!personality) {
        res.status(400).json({
          error: 'Missing required field: personality',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const responseStyle = PersonalityManager.getResponseStyle(personality as AIPersonalityState);

      res.json({
        success: true,
        data: responseStyle,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Determine if a follow-up question should be asked
   */
  async shouldAskFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { personality, responseQuality, responseLength } = req.body;
      
      if (!personality || responseQuality === undefined || responseLength === undefined) {
        res.status(400).json({
          error: 'Missing required fields: personality, responseQuality, responseLength',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const shouldAsk = PersonalityManager.shouldAskFollowUp(
        personality as AIPersonalityState,
        responseQuality,
        responseLength
      );

      res.json({
        success: true,
        data: {
          shouldAskFollowUp: shouldAsk,
          reasoning: this.getFollowUpReasoning(shouldAsk, responseQuality, responseLength, personality),
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get question preferences based on personality
   */
  async getQuestionPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { personality } = req.body;
      
      if (!personality) {
        res.status(400).json({
          error: 'Missing required field: personality',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const preferences = PersonalityManager.getQuestionPreferences(personality as AIPersonalityState);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Health check endpoint for AI interviewer service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Test basic AI service functionality
      const testContext: QuestionGenerationContext = {
        sessionId: 'health-check',
        userId: 'health-check',
        interviewConfig: {
          id: 'test',
          role: 'Software Engineer',
          industry: 'Technology',
          difficulty: 'mid' as any,
          duration: 60,
          questionTypes: ['behavioral' as any],
          focusAreas: ['communication' as any],
          aiPersonality: {
            name: 'Test Interviewer',
            style: 'professional' as any,
            tone: 'professional' as any,
            formality: 'semi_formal' as any,
            adaptiveness: 0.5,
            followUpIntensity: 0.5,
            encouragementLevel: 0.5,
          },
        },
        currentQuestionIndex: 0,
        previousResponses: [],
        personalityState: PersonalityManager.initializePersonality({
          name: 'Test Interviewer',
          style: 'professional' as any,
          tone: 'professional' as any,
          formality: 'semi_formal' as any,
          adaptiveness: 0.5,
          followUpIntensity: 0.5,
          encouragementLevel: 0.5,
        }),
      };

      // This is just a health check, so we don't actually call the AI service
      // to avoid unnecessary API costs
      res.json({
        success: true,
        data: {
          status: 'healthy',
          service: 'ai-interviewer',
          timestamp: new Date().toISOString(),
          features: {
            questionGeneration: 'available',
            followUpGeneration: 'available',
            responseEvaluation: 'available',
            personalityAdaptation: 'available',
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'AI Interviewer service health check failed',
        code: 'HEALTH_CHECK_FAILED',
      });
    }
  }

  private getDifficultyAdaptationReasoning(
    previousDifficulty: DifficultyLevel,
    adaptedDifficulty: DifficultyLevel,
    performanceMetrics: any
  ): string {
    if (previousDifficulty === adaptedDifficulty) {
      return 'Performance indicates current difficulty level is appropriate';
    }
    
    const difficultyLevels = ['entry', 'junior', 'mid', 'senior', 'principal', 'executive'];
    const prevIndex = difficultyLevels.indexOf(previousDifficulty);
    const newIndex = difficultyLevels.indexOf(adaptedDifficulty);
    
    if (newIndex > prevIndex) {
      return `Performance (avg: ${performanceMetrics.averageScore}%, confidence: ${(performanceMetrics.confidenceLevel * 100).toFixed(0)}%) indicates readiness for increased difficulty`;
    } else {
      return `Performance (avg: ${performanceMetrics.averageScore}%, confidence: ${(performanceMetrics.confidenceLevel * 100).toFixed(0)}%) suggests need for reduced difficulty`;
    }
  }

  private getFollowUpReasoning(
    shouldAsk: boolean,
    responseQuality: number,
    responseLength: number,
    personality: AIPersonalityState
  ): string {
    if (!shouldAsk) {
      if (personality.consecutiveFollowUps >= 2) {
        return 'Too many consecutive follow-ups already asked';
      }
      if (responseQuality > 0.8 && responseLength > 300) {
        return 'Response was comprehensive and high quality';
      }
      return 'Follow-up not needed based on personality and response characteristics';
    } else {
      if (responseQuality < 0.5) {
        return 'Response quality was low, follow-up needed for clarification';
      }
      if (responseLength < 50) {
        return 'Response was too brief, follow-up needed for more detail';
      }
      return 'Follow-up appropriate based on personality and response characteristics';
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('AI Interviewer controller error', { error });

    if (error instanceof QuestionGenerationError) {
      res.status(500).json({
        error: error.message,
        code: error.code,
        context: error.context ? 'Context provided' : 'No context',
      });
    } else if (error instanceof ResponseEvaluationError) {
      res.status(500).json({
        error: error.message,
        code: error.code,
        context: error.context ? 'Context provided' : 'No context',
      });
    } else if (error instanceof PersonalityAdaptationError) {
      res.status(500).json({
        error: error.message,
        code: error.code,
        context: error.context ? 'Context provided' : 'No context',
      });
    } else if (error instanceof TechnicalEvaluationError) {
      res.status(500).json({
        error: error.message,
        code: error.code,
        context: error.context ? 'Context provided' : 'No context',
      });
    } else if (error instanceof DifficultyAdaptationError) {
      res.status(500).json({
        error: error.message,
        code: error.code,
        context: error.context ? 'Context provided' : 'No context',
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}