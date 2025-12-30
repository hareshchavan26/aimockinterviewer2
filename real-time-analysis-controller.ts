/**
 * Real-Time Analysis Controller
 * Handles HTTP requests for real-time analysis pipeline
 * Requirements: 5.6
 */

import { Request, Response } from 'express';
import { RealTimeAnalysisPipeline } from '../services/real-time-analysis-pipeline';
import {
  RealTimeAnalysisRequest,
  RealTimeAnalysisConfig,
  AnalysisType,
  FeedbackFrequency,
  RealTimeAnalysisError,
  RealTimeAnalysisErrorCode
} from '../types/real-time-analysis';
import { logger } from '../utils/logger';

export class RealTimeAnalysisController {
  private analysisPipeline: RealTimeAnalysisPipeline;

  constructor() {
    // Initialize with default configuration
    const defaultConfig: RealTimeAnalysisConfig = {
      enableRealTimeFeedback: true,
      feedbackDelay: 500, // 500ms delay
      analysisWindow: 5000, // 5 second analysis window
      aggregationInterval: 1000, // 1 second aggregation
      hesitationThresholds: {
        minHesitationDuration: 300,
        maxAcceptableHesitations: 5,
        criticalHesitationDuration: 2000,
        patternDetectionWindow: 10000
      },
      nervousnessThresholds: {
        voiceStabilityThreshold: 0.7,
        paceVariabilityThreshold: 0.3,
        emotionalStabilityThreshold: 0.6,
        criticalNervousnessLevel: 0.8
      },
      confidenceThresholds: {
        minConfidenceLevel: 0.5,
        confidenceDropThreshold: 0.3,
        confidenceRecoveryThreshold: 0.7,
        stabilityWindow: 5000
      },
      feedbackSettings: {
        enablePositiveFeedback: true,
        enableCorrectiveFeedback: true,
        feedbackFrequency: FeedbackFrequency.IMMEDIATE,
        adaptiveFeedback: true,
        personalizedMessages: true
      }
    };

    this.analysisPipeline = new RealTimeAnalysisPipeline(defaultConfig);
  }

  /**
   * Start a new real-time analysis session
   */
  public startSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          error: 'Session ID is required',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      const session = this.analysisPipeline.startSession(sessionId);

      logger.info('Real-time analysis session started via API', { sessionId });

      res.status(201).json({
        success: true,
        session: {
          sessionId: session.sessionId,
          startTime: session.startTime,
          configuration: session.configuration
        }
      });

    } catch (error) {
      logger.error('Failed to start real-time analysis session', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to start analysis session',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Process real-time analysis request
   */
  public processAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        sessionId,
        analysisType,
        inputData,
        context,
        options
      } = req.body;

      // Validate required fields
      if (!sessionId || !analysisType || !inputData) {
        res.status(400).json({
          error: 'Missing required fields: sessionId, analysisType, inputData',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      // Validate analysis type
      if (!Object.values(AnalysisType).includes(analysisType)) {
        res.status(400).json({
          error: 'Invalid analysis type',
          code: 'INVALID_ANALYSIS_TYPE',
          validTypes: Object.values(AnalysisType)
        });
        return;
      }

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType,
        inputData: {
          ...inputData,
          timestamp: inputData.timestamp || Date.now(),
          sequenceNumber: inputData.sequenceNumber || 0
        },
        context: context || {
          questionType: 'general',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: options || {
          enableHesitationDetection: true,
          enableNervousnessDetection: true,
          enableConfidenceTracking: true,
          enablePaceAnalysis: true,
          enableEmotionTracking: true,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await this.analysisPipeline.processRealTimeAnalysis(request);

      logger.debug('Real-time analysis processed via API', {
        sessionId,
        analysisType,
        processingLatency: result.processingLatency,
        insightsCount: result.immediateInsights.length
      });

      res.status(200).json({
        success: true,
        result
      });

    } catch (error) {
      if (error instanceof RealTimeAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          error: error.message,
          code: error.code,
          details: error.details
        });
      } else {
        logger.error('Unexpected error in real-time analysis', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  };

  /**
   * Get current session state
   */
  public getSessionState = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          error: 'Session ID is required',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      const sessionState = this.analysisPipeline.getSessionState(sessionId);

      if (!sessionState) {
        res.status(404).json({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        sessionState
      });

    } catch (error) {
      logger.error('Failed to get session state', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to get session state',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Get session analysis history
   */
  public getSessionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!sessionId) {
        res.status(400).json({
          error: 'Session ID is required',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      const history = this.analysisPipeline.getSessionHistory(sessionId);
      
      if (history.length === 0) {
        res.status(404).json({
          error: 'Session not found or no history available',
          code: 'SESSION_NOT_FOUND'
        });
        return;
      }

      // Apply pagination
      const startIndex = Math.max(0, Number(offset));
      const endIndex = startIndex + Math.min(100, Number(limit)); // Max 100 results
      const paginatedHistory = history.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        history: paginatedHistory,
        pagination: {
          total: history.length,
          offset: startIndex,
          limit: endIndex - startIndex,
          hasMore: endIndex < history.length
        }
      });

    } catch (error) {
      logger.error('Failed to get session history', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to get session history',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * End analysis session
   */
  public endSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          error: 'Session ID is required',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      this.analysisPipeline.endSession(sessionId);

      logger.info('Real-time analysis session ended via API', { sessionId });

      res.status(200).json({
        success: true,
        message: 'Session ended successfully'
      });

    } catch (error) {
      logger.error('Failed to end session', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to end session',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Process text stream analysis
   */
  public processTextStream = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, text, context } = req.body;

      if (!sessionId || !text) {
        res.status(400).json({
          error: 'Session ID and text are required',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      const request: RealTimeAnalysisRequest = {
        sessionId,
        analysisType: AnalysisType.TEXT_STREAM,
        inputData: {
          text,
          timestamp: Date.now(),
          sequenceNumber: 0
        },
        context: context || {
          questionType: 'general',
          interviewStage: 'behavioral',
          currentTime: Date.now(),
          sessionStartTime: Date.now()
        },
        options: {
          enableHesitationDetection: true,
          enableNervousnessDetection: false,
          enableConfidenceTracking: true,
          enablePaceAnalysis: false,
          enableEmotionTracking: false,
          feedbackThreshold: 0.7,
          aggregationWindow: 5000
        }
      };

      const result = await this.analysisPipeline.processRealTimeAnalysis(request);

      res.status(200).json({
        success: true,
        result: {
          insights: result.immediateInsights,
          hesitation: result.hesitationDetection,
          feedback: result.feedbackTriggers,
          confidence: result.confidence
        }
      });

    } catch (error) {
      if (error instanceof RealTimeAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          error: 'Failed to process text stream',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  };

  /**
   * Get appropriate HTTP status code for analysis error
   */
  private getStatusCodeForError(errorCode: RealTimeAnalysisErrorCode): number {
    switch (errorCode) {
      case RealTimeAnalysisErrorCode.INVALID_INPUT_DATA:
      case RealTimeAnalysisErrorCode.INSUFFICIENT_DATA:
        return 400;
      case RealTimeAnalysisErrorCode.SESSION_NOT_FOUND:
        return 404;
      case RealTimeAnalysisErrorCode.ANALYSIS_TIMEOUT:
        return 408;
      case RealTimeAnalysisErrorCode.PROCESSING_FAILED:
      case RealTimeAnalysisErrorCode.CONFIGURATION_ERROR:
      case RealTimeAnalysisErrorCode.STREAM_INTERRUPTED:
      case RealTimeAnalysisErrorCode.FEEDBACK_GENERATION_FAILED:
      default:
        return 500;
    }
  }
}