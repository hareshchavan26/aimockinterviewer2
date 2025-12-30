import { Request, Response } from 'express';
import { 
  DefaultImprovementRecommendationService,
  BetterAnswerSuggestion,
  PersonalizedDrill 
} from '../services/improvement-recommendation-service';
import { DefaultAnswerSuggestionService } from '../services/answer-suggestion-service';
import { DefaultPracticeDrillService } from '../services/practice-drill-service';
import { logger } from '../utils/logger';
import {
  CategoryScores,
  ResponseAnalysis,
  InterviewSession,
  UserResponse,
  ImprovementPlan
} from '@ai-interview/types';

export class ImprovementController {
  private improvementService: DefaultImprovementRecommendationService;
  private answerSuggestionService: DefaultAnswerSuggestionService;
  private practiceDrillService: DefaultPracticeDrillService;

  constructor() {
    this.improvementService = new DefaultImprovementRecommendationService();
    this.answerSuggestionService = new DefaultAnswerSuggestionService();
    this.practiceDrillService = new DefaultPracticeDrillService();
  }

  /**
   * Generate personalized improvement plan
   * POST /api/reporting/improvement/plan
   */
  async generateImprovementPlan(req: Request, res: Response): Promise<void> {
    try {
      const { categoryScores, analyses, session } = req.body;

      if (!categoryScores || !analyses || !session) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'categoryScores, analyses, and session are required'
          }
        });
        return;
      }

      logger.info('Generating personalized improvement plan', {
        sessionId: session.id,
        userId: session.userId
      });

      const improvementPlan = await this.improvementService.generatePersonalizedPlan(
        categoryScores as CategoryScores,
        analyses as ResponseAnalysis[],
        session as InterviewSession
      );

      res.json({
        success: true,
        data: improvementPlan,
        message: 'Personalized improvement plan generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate improvement plan', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'IMPROVEMENT_PLAN_GENERATION_FAILED',
          message: 'Failed to generate improvement plan'
        }
      });
    }
  }

  /**
   * Generate better answer suggestions
   * POST /api/reporting/improvement/answer-suggestions
   */
  async generateAnswerSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { session, responses, analyses } = req.body;

      if (!session || !responses || !analyses) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'session, responses, and analyses are required'
          }
        });
        return;
      }

      logger.info('Generating better answer suggestions', {
        sessionId: session.id,
        responseCount: responses.length
      });

      const suggestions = await this.answerSuggestionService.generateBetterAnswerSuggestions(
        session as InterviewSession,
        responses as UserResponse[],
        analyses as ResponseAnalysis[]
      );

      res.json({
        success: true,
        data: suggestions,
        message: 'Better answer suggestions generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate answer suggestions', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'ANSWER_SUGGESTIONS_GENERATION_FAILED',
          message: 'Failed to generate answer suggestions'
        }
      });
    }
  }

  /**
   * Generate personalized practice drills
   * POST /api/reporting/improvement/practice-drills
   */
  async generatePracticeDrills(req: Request, res: Response): Promise<void> {
    try {
      const { priorityAreas, categoryScores, session, userHistory } = req.body;

      if (!priorityAreas || !categoryScores || !session) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'priorityAreas, categoryScores, and session are required'
          }
        });
        return;
      }

      logger.info('Generating personalized practice drills', {
        sessionId: session.id,
        priorityAreas
      });

      const drills = await this.practiceDrillService.generatePersonalizedDrills(
        priorityAreas as string[],
        categoryScores as CategoryScores,
        session as InterviewSession,
        userHistory as InterviewSession[]
      );

      res.json({
        success: true,
        data: drills,
        message: 'Personalized practice drills generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate practice drills', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PRACTICE_DRILLS_GENERATION_FAILED',
          message: 'Failed to generate practice drills'
        }
      });
    }
  }

  /**
   * Generate progressive drill plan
   * POST /api/reporting/improvement/progressive-plan
   */
  async generateProgressivePlan(req: Request, res: Response): Promise<void> {
    try {
      const { targetArea, currentLevel, timeframe } = req.body;

      if (!targetArea || currentLevel === undefined || !timeframe) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'targetArea, currentLevel, and timeframe are required'
          }
        });
        return;
      }

      logger.info('Generating progressive drill plan', {
        targetArea,
        currentLevel,
        timeframe
      });

      const progressivePlan = await this.practiceDrillService.generateProgressiveDrillPlan(
        targetArea as string,
        currentLevel as number,
        timeframe as number
      );

      res.json({
        success: true,
        data: progressivePlan,
        message: 'Progressive drill plan generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate progressive plan', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PROGRESSIVE_PLAN_GENERATION_FAILED',
          message: 'Failed to generate progressive plan'
        }
      });
    }
  }

  /**
   * Generate daily practice routine
   * POST /api/reporting/improvement/daily-routine
   */
  async generateDailyRoutine(req: Request, res: Response): Promise<void> {
    try {
      const { priorityAreas, availableTimePerDay } = req.body;

      if (!priorityAreas || !availableTimePerDay) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'priorityAreas and availableTimePerDay are required'
          }
        });
        return;
      }

      logger.info('Generating daily practice routine', {
        priorityAreas,
        availableTimePerDay
      });

      const dailyRoutine = await this.practiceDrillService.generateDailyPracticeRoutine(
        priorityAreas as string[],
        availableTimePerDay as number
      );

      res.json({
        success: true,
        data: dailyRoutine,
        message: 'Daily practice routine generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate daily routine', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'DAILY_ROUTINE_GENERATION_FAILED',
          message: 'Failed to generate daily routine'
        }
      });
    }
  }

  /**
   * Generate STAR method examples
   * POST /api/reporting/improvement/star-examples
   */
  async generateSTARExamples(req: Request, res: Response): Promise<void> {
    try {
      const { industry, role, weaknessArea } = req.body;

      if (!industry || !role || !weaknessArea) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'industry, role, and weaknessArea are required'
          }
        });
        return;
      }

      logger.info('Generating STAR method examples', {
        industry,
        role,
        weaknessArea
      });

      const starExamples = await this.improvementService.generateSTARMethodExamples(
        industry as string,
        role as string,
        weaknessArea as string
      );

      res.json({
        success: true,
        data: starExamples,
        message: 'STAR method examples generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate STAR examples', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'STAR_EXAMPLES_GENERATION_FAILED',
          message: 'Failed to generate STAR examples'
        }
      });
    }
  }

  /**
   * Generate answer templates
   * POST /api/reporting/improvement/answer-templates
   */
  async generateAnswerTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { questionType, industry, role } = req.body;

      if (!questionType || !industry || !role) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'questionType, industry, and role are required'
          }
        });
        return;
      }

      logger.info('Generating answer templates', {
        questionType,
        industry,
        role
      });

      const templates = await this.answerSuggestionService.generateAnswerTemplates(
        questionType as string,
        industry as string,
        role as string
      );

      res.json({
        success: true,
        data: templates,
        message: 'Answer templates generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate answer templates', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'ANSWER_TEMPLATES_GENERATION_FAILED',
          message: 'Failed to generate answer templates'
        }
      });
    }
  }

  /**
   * Get comprehensive improvement package
   * POST /api/reporting/improvement/comprehensive
   */
  async getComprehensiveImprovementPackage(req: Request, res: Response): Promise<void> {
    try {
      const { categoryScores, analyses, session, responses, userHistory } = req.body;

      if (!categoryScores || !analyses || !session || !responses) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'categoryScores, analyses, session, and responses are required'
          }
        });
        return;
      }

      logger.info('Generating comprehensive improvement package', {
        sessionId: session.id,
        userId: session.userId
      });

      // Generate all improvement components
      const [improvementPlan, answerSuggestions, practiceDrills] = await Promise.all([
        this.improvementService.generatePersonalizedPlan(
          categoryScores as CategoryScores,
          analyses as ResponseAnalysis[],
          session as InterviewSession
        ),
        this.answerSuggestionService.generateBetterAnswerSuggestions(
          session as InterviewSession,
          responses as UserResponse[],
          analyses as ResponseAnalysis[]
        ),
        this.practiceDrillService.generatePersonalizedDrills(
          [], // Will be populated from improvement plan
          categoryScores as CategoryScores,
          session as InterviewSession,
          userHistory as InterviewSession[]
        )
      ]);

      // Generate additional resources
      const starExamples = await this.improvementService.generateSTARMethodExamples(
        session.config.industry,
        session.config.role,
        improvementPlan.priorityAreas[0] || 'communication'
      );

      const answerTemplates = await this.answerSuggestionService.generateAnswerTemplates(
        'behavioral',
        session.config.industry,
        session.config.role
      );

      const comprehensivePackage = {
        improvementPlan,
        answerSuggestions,
        practiceDrills,
        starExamples,
        answerTemplates,
        summary: {
          priorityAreas: improvementPlan.priorityAreas,
          estimatedTimeToImprove: improvementPlan.estimatedTimeToImprove,
          totalRecommendations: improvementPlan.recommendations.length,
          totalPracticeExercises: improvementPlan.practiceExercises.length,
          totalAnswerSuggestions: answerSuggestions.length,
          totalPersonalizedDrills: practiceDrills.length
        }
      };

      res.json({
        success: true,
        data: comprehensivePackage,
        message: 'Comprehensive improvement package generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate comprehensive improvement package', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'COMPREHENSIVE_PACKAGE_GENERATION_FAILED',
          message: 'Failed to generate comprehensive improvement package'
        }
      });
    }
  }
}