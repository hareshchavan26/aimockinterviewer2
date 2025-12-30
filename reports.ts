import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ReportGeneratorService } from '../services/report-generator';
import { ReportRepository } from '../database/repository';
import { logger } from '../utils/logger';
import { ApiResponse } from '@ai-interview/types';

export const createReportRoutes = (
  reportGenerator: ReportGeneratorService,
  reportRepository: ReportRepository
) => {
  const router = Router();

  // Generate a new performance report
  router.post(
    '/generate',
    [
      body('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
      body('sessionData')
        .optional()
        .isObject()
        .withMessage('Session data must be an object'),
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: errors.array(),
            },
          } as ApiResponse);
        }

        const { sessionId, sessionData } = req.body;

        logger.info('Generating performance report', { sessionId });

        // Check if report already exists for this session
        const existingReport = await reportRepository.getReportsBySessionId(sessionId);
        if (existingReport) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'REPORT_EXISTS',
              message: 'Report already exists for this session',
            },
          } as ApiResponse);
        }

        // Generate the report
        const report = await reportGenerator.generateReport(sessionId);

        // Save the report
        await reportRepository.saveReport(report);

        logger.info('Performance report generated and saved', { 
          sessionId, 
          reportId: report.id 
        });

        res.status(201).json({
          success: true,
          data: report,
          message: 'Performance report generated successfully',
        } as ApiResponse);

      } catch (error) {
        logger.error('Failed to generate performance report', { 
          sessionId: req.body.sessionId, 
          error 
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'REPORT_GENERATION_FAILED',
            message: 'Failed to generate performance report',
          },
        } as ApiResponse);
      }
    }
  );

  // Get a specific report by ID
  router.get(
    '/:reportId',
    [
      param('reportId')
        .isString()
        .notEmpty()
        .withMessage('Report ID is required'),
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: errors.array(),
            },
          } as ApiResponse);
        }

        const { reportId } = req.params;

        const report = await reportRepository.getReport(reportId);

        if (!report) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'REPORT_NOT_FOUND',
              message: 'Performance report not found',
            },
          } as ApiResponse);
        }

        res.json({
          success: true,
          data: report,
        } as ApiResponse);

      } catch (error) {
        logger.error('Failed to get performance report', { 
          reportId: req.params.reportId, 
          error 
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'REPORT_RETRIEVAL_FAILED',
            message: 'Failed to retrieve performance report',
          },
        } as ApiResponse);
      }
    }
  );

  // Get reports by user ID
  router.get(
    '/user/:userId',
    [
      param('userId')
        .isString()
        .notEmpty()
        .withMessage('User ID is required'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: errors.array(),
            },
          } as ApiResponse);
        }

        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const reports = await reportRepository.getReportsByUserId(userId, limit, offset);
        const totalCount = await reportRepository.getReportCount(userId);

        res.json({
          success: true,
          data: {
            reports,
            pagination: {
              limit,
              offset,
              total: totalCount,
              hasMore: offset + reports.length < totalCount,
            },
          },
        } as ApiResponse);

      } catch (error) {
        logger.error('Failed to get reports by user ID', { 
          userId: req.params.userId, 
          error 
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'REPORTS_RETRIEVAL_FAILED',
            message: 'Failed to retrieve user reports',
          },
        } as ApiResponse);
      }
    }
  );

  // Get report by session ID
  router.get(
    '/session/:sessionId',
    [
      param('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: errors.array(),
            },
          } as ApiResponse);
        }

        const { sessionId } = req.params;

        const report = await reportRepository.getReportsBySessionId(sessionId);

        if (!report) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'REPORT_NOT_FOUND',
              message: 'No report found for this session',
            },
          } as ApiResponse);
        }

        res.json({
          success: true,
          data: report,
        } as ApiResponse);

      } catch (error) {
        logger.error('Failed to get report by session ID', { 
          sessionId: req.params.sessionId, 
          error 
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'REPORT_RETRIEVAL_FAILED',
            message: 'Failed to retrieve session report',
          },
        } as ApiResponse);
      }
    }
  );

  // Delete a report
  router.delete(
    '/:reportId',
    [
      param('reportId')
        .isString()
        .notEmpty()
        .withMessage('Report ID is required'),
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: errors.array(),
            },
          } as ApiResponse);
        }

        const { reportId } = req.params;

        const deleted = await reportRepository.deleteReport(reportId);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'REPORT_NOT_FOUND',
              message: 'Performance report not found',
            },
          } as ApiResponse);
        }

        res.json({
          success: true,
          message: 'Performance report deleted successfully',
        } as ApiResponse);

      } catch (error) {
        logger.error('Failed to delete performance report', { 
          reportId: req.params.reportId, 
          error 
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'REPORT_DELETION_FAILED',
            message: 'Failed to delete performance report',
          },
        } as ApiResponse);
      }
    }
  );

  // Health check for reports
  router.get('/health/check', async (req: Request, res: Response) => {
    try {
      // Simple health check - could be expanded to check database connectivity
      res.json({
        success: true,
        message: 'Reporting service is healthy',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed',
        },
      } as ApiResponse);
    }
  });

  return router;
};