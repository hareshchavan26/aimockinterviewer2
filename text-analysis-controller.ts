/**
 * Text Analysis Controller
 * HTTP endpoints for text analysis functionality
 */

import { Request, Response } from 'express';
import { TextAnalysisEngine } from '../services/text-analysis-engine';
import { logger } from '../utils/logger';
import {
  TextAnalysisRequest,
  TextAnalysisOptions,
  QuestionType,
  ResponseStructure,
  DifficultyLevel,
  TextAnalysisConfig,
  TextAnalysisError,
  TextAnalysisErrorCode
} from '../types/text-analysis';

export class TextAnalysisController {
  private textAnalysisEngine: TextAnalysisEngine;

  constructor() {
    // Initialize with default configuration
    const defaultConfig: TextAnalysisConfig = {
      enableAdvancedAnalysis: true,
      industryKeywords: {
        technology: ['software', 'development', 'programming', 'algorithm', 'database', 'API', 'framework'],
        finance: ['investment', 'portfolio', 'risk', 'compliance', 'trading', 'analysis', 'market'],
        healthcare: ['patient', 'treatment', 'diagnosis', 'clinical', 'medical', 'healthcare', 'therapy'],
        consulting: ['strategy', 'analysis', 'recommendation', 'client', 'solution', 'implementation'],
        general: ['project', 'team', 'leadership', 'communication', 'problem-solving', 'collaboration']
      },
      roleKeywords: {
        'software-engineer': ['coding', 'debugging', 'testing', 'architecture', 'scalability', 'performance'],
        'product-manager': ['roadmap', 'stakeholder', 'requirements', 'prioritization', 'metrics', 'user'],
        'data-scientist': ['analysis', 'modeling', 'statistics', 'machine learning', 'insights', 'data'],
        'consultant': ['client', 'strategy', 'recommendation', 'analysis', 'implementation', 'solution'],
        'manager': ['team', 'leadership', 'delegation', 'performance', 'goals', 'development']
      },
      starMethodWeights: {
        situation: 0.2,
        task: 0.2,
        action: 0.4,
        result: 0.2
      },
      qualityThresholds: {
        excellent: 0.85,
        good: 0.70,
        fair: 0.55,
        poor: 0.40
      },
      grammarRules: {
        enableSpellCheck: true,
        enableGrammarCheck: true,
        enableStyleCheck: true,
        strictness: 'moderate' as any
      }
    };

    this.textAnalysisEngine = new TextAnalysisEngine(defaultConfig);
  }

  /**
   * Analyze text content
   */
  public analyzeText = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, context, options } = req.body;

      // Validate required fields
      if (!text || typeof text !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Text content is required and must be a string'
        });
        return;
      }

      // Set default context if not provided
      const analysisContext = {
        questionType: context?.questionType || QuestionType.BEHAVIORAL,
        expectedStructure: context?.expectedStructure || ResponseStructure.FREE_FORM,
        role: context?.role || 'general',
        industry: context?.industry || 'general',
        difficultyLevel: context?.difficultyLevel || DifficultyLevel.MID,
        ...context
      };

      // Set default options if not provided
      const analysisOptions: TextAnalysisOptions = {
        enableContentQuality: true,
        enableStructureAnalysis: true,
        enableKeywordRelevance: true,
        enableSTARMethod: analysisContext.expectedStructure === ResponseStructure.STAR,
        enableGrammarCheck: true,
        enableSentimentAnalysis: true,
        confidenceThreshold: 0.7,
        ...options
      };

      const request: TextAnalysisRequest = {
        text,
        context: analysisContext,
        options: analysisOptions
      };

      logger.info('Processing text analysis request', {
        textLength: text.length,
        questionType: analysisContext.questionType,
        expectedStructure: analysisContext.expectedStructure,
        role: analysisContext.role,
        industry: analysisContext.industry
      });

      const result = await this.textAnalysisEngine.analyzeText(request);

      res.json({
        success: true,
        analysis: result
      });

    } catch (error: any) {
      logger.error('Text analysis failed', { error });

      if (error instanceof TextAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };

  /**
   * Analyze STAR method structure specifically
   */
  public analyzeSTARMethod = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, context } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Text content is required and must be a string'
        });
        return;
      }

      const analysisContext = {
        questionType: QuestionType.BEHAVIORAL,
        expectedStructure: ResponseStructure.STAR,
        role: context?.role || 'general',
        industry: context?.industry || 'general',
        difficultyLevel: context?.difficultyLevel || DifficultyLevel.MID,
        ...context
      };

      const analysisOptions: TextAnalysisOptions = {
        enableContentQuality: true,
        enableStructureAnalysis: true,
        enableKeywordRelevance: false,
        enableSTARMethod: true,
        enableGrammarCheck: false,
        enableSentimentAnalysis: false,
        confidenceThreshold: 0.7
      };

      const request: TextAnalysisRequest = {
        text,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.textAnalysisEngine.analyzeText(request);

      res.json({
        success: true,
        starAnalysis: result.starMethodAnalysis,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('STAR method analysis failed', { error });

      if (error instanceof TextAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };

  /**
   * Analyze content quality only
   */
  public analyzeContentQuality = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, context } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Text content is required and must be a string'
        });
        return;
      }

      const analysisContext = {
        questionType: context?.questionType || QuestionType.BEHAVIORAL,
        expectedStructure: ResponseStructure.FREE_FORM,
        role: context?.role || 'general',
        industry: context?.industry || 'general',
        difficultyLevel: context?.difficultyLevel || DifficultyLevel.MID,
        ...context
      };

      const analysisOptions: TextAnalysisOptions = {
        enableContentQuality: true,
        enableStructureAnalysis: false,
        enableKeywordRelevance: true,
        enableSTARMethod: false,
        enableGrammarCheck: false,
        enableSentimentAnalysis: false,
        confidenceThreshold: 0.7
      };

      const request: TextAnalysisRequest = {
        text,
        context: analysisContext,
        options: analysisOptions
      };

      const result = await this.textAnalysisEngine.analyzeText(request);

      res.json({
        success: true,
        contentQuality: result.contentQuality,
        keywordRelevance: result.keywordRelevance,
        overallScore: result.overallScore,
        recommendations: result.recommendations
      });

    } catch (error: any) {
      logger.error('Content quality analysis failed', { error });

      if (error instanceof TextAnalysisError) {
        const statusCode = this.getStatusCodeForError(error.code);
        res.status(statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  };

  /**
   * Get available analysis options and configurations
   */
  public getAnalysisOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = {
        questionTypes: Object.values(QuestionType),
        responseStructures: Object.values(ResponseStructure),
        difficultyLevels: Object.values(DifficultyLevel),
        availableIndustries: [
          'technology',
          'finance',
          'healthcare',
          'consulting',
          'general'
        ],
        availableRoles: [
          'software-engineer',
          'product-manager',
          'data-scientist',
          'consultant',
          'manager'
        ],
        analysisFeatures: {
          contentQuality: 'Evaluates content depth, specificity, and relevance',
          structureAnalysis: 'Analyzes response organization and flow',
          keywordRelevance: 'Checks for industry and role-specific terminology',
          starMethod: 'Evaluates STAR method structure compliance',
          grammarCheck: 'Identifies grammar, spelling, and style issues',
          sentimentAnalysis: 'Analyzes emotional tone and confidence'
        }
      };

      res.json({
        success: true,
        options
      });

    } catch (error: any) {
      logger.error('Failed to get analysis options', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Batch analyze multiple texts
   */
  public batchAnalyze = async (req: Request, res: Response): Promise<void> => {
    try {
      const { texts, context, options } = req.body;

      if (!Array.isArray(texts) || texts.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Texts array is required and must not be empty'
        });
        return;
      }

      if (texts.length > 10) {
        res.status(400).json({
          success: false,
          error: 'Maximum 10 texts allowed per batch request'
        });
        return;
      }

      const analysisContext = {
        questionType: context?.questionType || QuestionType.BEHAVIORAL,
        expectedStructure: context?.expectedStructure || ResponseStructure.FREE_FORM,
        role: context?.role || 'general',
        industry: context?.industry || 'general',
        difficultyLevel: context?.difficultyLevel || DifficultyLevel.MID,
        ...context
      };

      const analysisOptions: TextAnalysisOptions = {
        enableContentQuality: true,
        enableStructureAnalysis: true,
        enableKeywordRelevance: true,
        enableSTARMethod: analysisContext.expectedStructure === ResponseStructure.STAR,
        enableGrammarCheck: true,
        enableSentimentAnalysis: true,
        confidenceThreshold: 0.7,
        ...options
      };

      const results = [];
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        
        if (typeof text !== 'string') {
          results.push({
            index: i,
            success: false,
            error: 'Text must be a string'
          });
          continue;
        }

        try {
          const request: TextAnalysisRequest = {
            text,
            context: analysisContext,
            options: analysisOptions
          };

          const result = await this.textAnalysisEngine.analyzeText(request);
          
          results.push({
            index: i,
            success: true,
            analysis: result
          });

        } catch (error: any) {
          logger.error(`Batch analysis failed for text ${i}`, { error });
          results.push({
            index: i,
            success: false,
            error: error instanceof TextAnalysisError ? error.message : 'Analysis failed'
          });
        }
      }

      res.json({
        success: true,
        results,
        summary: {
          total: texts.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });

    } catch (error: any) {
      logger.error('Batch analysis failed', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  private getStatusCodeForError(code: TextAnalysisErrorCode): number {
    switch (code) {
      case TextAnalysisErrorCode.INVALID_INPUT:
        return 400;
      case TextAnalysisErrorCode.RESOURCE_LIMIT_EXCEEDED:
        return 413;
      case TextAnalysisErrorCode.TIMEOUT:
        return 408;
      case TextAnalysisErrorCode.CONFIGURATION_ERROR:
        return 500;
      case TextAnalysisErrorCode.PROCESSING_FAILED:
      default:
        return 500;
    }
  }
}