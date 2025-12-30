import { Request, Response } from 'express';
import {
  InterviewConfigService,
  CreateInterviewConfigRequest,
  UpdateInterviewConfigRequest,
  TemplateFilters,
  InterviewConfigError,
  ConfigNotFoundError,
  TemplateNotFoundError,
  ConfigValidationError,
  UnauthorizedAccessError,
} from '../types/interview-config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export class InterviewConfigController {
  constructor(private configService: InterviewConfigService) {}

  // Configuration endpoints
  async createConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const configData: CreateInterviewConfigRequest = req.body;
      const config = await this.configService.createConfiguration(userId, configData);

      res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      const config = await this.configService.getConfiguration(configId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getUserConfigurations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId || req.params.userId;
      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const configs = await this.configService.getUserConfigurations(userId);

      res.json({
        success: true,
        data: configs,
        count: configs.length,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      const configData: UpdateInterviewConfigRequest = req.body;

      // Check ownership (simplified - in real app, this would be middleware)
      const existingConfig = await this.configService.getConfiguration(configId);
      if (req.userId && existingConfig.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      const updatedConfig = await this.configService.updateConfiguration(configId, configData);

      res.json({
        success: true,
        data: updatedConfig,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deleteConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { configId } = req.params;

      // Check ownership (simplified - in real app, this would be middleware)
      const existingConfig = await this.configService.getConfiguration(configId);
      if (req.userId && existingConfig.userId !== req.userId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        });
        return;
      }

      await this.configService.deleteConfiguration(configId);

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async validateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const configData = req.body;
      const validation = await this.configService.validateConfiguration(configData);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // Template endpoints
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const template = await this.configService.getTemplate(templateId);

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async searchTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { q: query } = req.query;
      const filters: TemplateFilters = {};

      // Extract filters from query parameters
      if (req.query.role) filters.role = req.query.role as string;
      if (req.query.industry) filters.industry = req.query.industry as string;
      if (req.query.difficulty) filters.difficulty = req.query.difficulty as any;
      if (req.query.minDuration || req.query.maxDuration) {
        filters.duration = {};
        if (req.query.minDuration) filters.duration.min = parseInt(req.query.minDuration as string);
        if (req.query.maxDuration) filters.duration.max = parseInt(req.query.maxDuration as string);
      }
      if (req.query.questionTypes) {
        filters.questionTypes = (req.query.questionTypes as string).split(',') as any[];
      }
      if (req.query.tags) {
        filters.tags = (req.query.tags as string).split(',');
      }
      if (req.query.isPublic !== undefined) {
        filters.isPublic = req.query.isPublic === 'true';
      }

      const templates = await this.configService.searchTemplates(query as string, filters);

      res.json({
        success: true,
        data: templates,
        count: templates.length,
        filters: filters,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getTemplatesByRole(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.params;
      const templates = await this.configService.getTemplatesByRole(role);

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getTemplatesByIndustry(req: Request, res: Response): Promise<void> {
    try {
      const { industry } = req.params;
      const templates = await this.configService.getTemplatesByIndustry(industry);

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Controller error', { error });

    if (error instanceof ConfigValidationError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
        validationErrors: error.validationErrors,
      });
    } else if (error instanceof ConfigNotFoundError || error instanceof TemplateNotFoundError) {
      res.status(404).json({
        error: error.message,
        code: error.code,
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