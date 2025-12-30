import { Request, Response } from 'express';
import { 
  DefaultReportExportService,
  ExportOptions,
  ExportResult,
  ShareableLink
} from '../services/report-export-service';
import { logger } from '../utils/logger';
import {
  PerformanceReport,
  InterviewSession
} from '@ai-interview/types';

export class ReportExportController {
  private exportService: DefaultReportExportService;

  constructor() {
    this.exportService = new DefaultReportExportService();
  }

  /**
   * Export single report to PDF
   * POST /api/reporting/export/pdf
   */
  async exportToPDF(req: Request, res: Response): Promise<void> {
    try {
      const { report, session, options } = req.body;

      if (!report || !session) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_DATA',
            message: 'Report and session data are required'
          }
        });
        return;
      }

      logger.info('Exporting report to PDF', { 
        reportId: report.id, 
        sessionId: session.id 
      });

      const result = await this.exportService.exportToPDF(
        report as PerformanceReport,
        session as InterviewSession,
        options as Partial<ExportOptions>
      );

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: 'Report exported to PDF successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'PDF_EXPORT_FAILED',
            message: result.error || 'Failed to export report to PDF'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to export report to PDF', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'PDF_EXPORT_ERROR',
          message: 'Internal error during PDF export'
        }
      });
    }
  }

  /**
   * Export single report to JSON
   * POST /api/reporting/export/json
   */
  async exportToJSON(req: Request, res: Response): Promise<void> {
    try {
      const { report, session, options } = req.body;

      if (!report || !session) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_DATA',
            message: 'Report and session data are required'
          }
        });
        return;
      }

      logger.info('Exporting report to JSON', { 
        reportId: report.id, 
        sessionId: session.id 
      });

      const result = await this.exportService.exportToJSON(
        report as PerformanceReport,
        session as InterviewSession,
        options as Partial<ExportOptions>
      );

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: 'Report exported to JSON successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'JSON_EXPORT_FAILED',
            message: result.error || 'Failed to export report to JSON'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to export report to JSON', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'JSON_EXPORT_ERROR',
          message: 'Internal error during JSON export'
        }
      });
    }
  }

  /**
   * Export multiple reports to CSV
   * POST /api/reporting/export/csv
   */
  async exportToCSV(req: Request, res: Response): Promise<void> {
    try {
      const { reports, sessions, options } = req.body;

      if (!reports || !sessions) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_DATA',
            message: 'Reports and sessions data are required'
          }
        });
        return;
      }

      if (!Array.isArray(reports) || !Array.isArray(sessions)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA_FORMAT',
            message: 'Reports and sessions must be arrays'
          }
        });
        return;
      }

      logger.info('Exporting reports to CSV', { 
        reportCount: reports.length,
        sessionCount: sessions.length 
      });

      const result = await this.exportService.exportToCSV(
        reports as PerformanceReport[],
        sessions as InterviewSession[],
        options as Partial<ExportOptions>
      );

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: 'Reports exported to CSV successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'CSV_EXPORT_FAILED',
            message: result.error || 'Failed to export reports to CSV'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to export reports to CSV', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CSV_EXPORT_ERROR',
          message: 'Internal error during CSV export'
        }
      });
    }
  }

  /**
   * Export report in specified format
   * POST /api/reporting/export/:format
   */
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { format } = req.params;
      const { report, session, reports, sessions, options } = req.body;

      if (!['pdf', 'json', 'csv'].includes(format)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be pdf, json, or csv'
          }
        });
        return;
      }

      logger.info('Exporting report', { format, reportId: report?.id });

      let result: ExportResult;

      switch (format) {
        case 'pdf':
          if (!report || !session) {
            res.status(400).json({
              success: false,
              error: {
                code: 'MISSING_REQUIRED_DATA',
                message: 'Report and session data are required for PDF export'
              }
            });
            return;
          }
          result = await this.exportService.exportToPDF(report, session, options);
          break;

        case 'json':
          if (!report || !session) {
            res.status(400).json({
              success: false,
              error: {
                code: 'MISSING_REQUIRED_DATA',
                message: 'Report and session data are required for JSON export'
              }
            });
            return;
          }
          result = await this.exportService.exportToJSON(report, session, options);
          break;

        case 'csv':
          if (!reports || !sessions) {
            res.status(400).json({
              success: false,
              error: {
                code: 'MISSING_REQUIRED_DATA',
                message: 'Reports and sessions data are required for CSV export'
              }
            });
            return;
          }
          result = await this.exportService.exportToCSV(reports, sessions, options);
          break;

        default:
          res.status(400).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: `Format ${format} is not supported`
            }
          });
          return;
      }

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: `Report exported to ${format.toUpperCase()} successfully`
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'EXPORT_FAILED',
            message: result.error || `Failed to export report to ${format.toUpperCase()}`
          }
        });
      }

    } catch (error) {
      logger.error('Failed to export report', { error, format: req.params.format });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Internal error during report export'
        }
      });
    }
  }

  /**
   * Create shareable link for report
   * POST /api/reporting/export/share
   */
  async createShareableLink(req: Request, res: Response): Promise<void> {
    try {
      const { reportId, userId, expirationHours, maxAccess } = req.body;

      if (!reportId || !userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Report ID and User ID are required'
          }
        });
        return;
      }

      logger.info('Creating shareable link', { reportId, userId });

      const shareableLink = await this.exportService.createShareableLink(
        reportId,
        userId,
        expirationHours,
        maxAccess
      );

      res.json({
        success: true,
        data: shareableLink,
        message: 'Shareable link created successfully'
      });

    } catch (error) {
      logger.error('Failed to create shareable link', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SHAREABLE_LINK_CREATION_FAILED',
          message: 'Failed to create shareable link'
        }
      });
    }
  }

  /**
   * Get shareable link details
   * GET /api/reporting/export/share/:linkId
   */
  async getShareableLink(req: Request, res: Response): Promise<void> {
    try {
      const { linkId } = req.params;

      if (!linkId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_LINK_ID',
            message: 'Link ID is required'
          }
        });
        return;
      }

      logger.info('Getting shareable link', { linkId });

      const shareableLink = await this.exportService.getShareableLink(linkId);

      if (!shareableLink) {
        res.status(404).json({
          success: false,
          error: {
            code: 'LINK_NOT_FOUND',
            message: 'Shareable link not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: shareableLink,
        message: 'Shareable link retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get shareable link', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SHAREABLE_LINK_RETRIEVAL_FAILED',
          message: 'Failed to retrieve shareable link'
        }
      });
    }
  }

  /**
   * Revoke shareable link
   * DELETE /api/reporting/export/share/:linkId
   */
  async revokeShareableLink(req: Request, res: Response): Promise<void> {
    try {
      const { linkId } = req.params;

      if (!linkId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_LINK_ID',
            message: 'Link ID is required'
          }
        });
        return;
      }

      logger.info('Revoking shareable link', { linkId });

      await this.exportService.revokeShareableLink(linkId);

      res.json({
        success: true,
        message: 'Shareable link revoked successfully'
      });

    } catch (error) {
      logger.error('Failed to revoke shareable link', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SHAREABLE_LINK_REVOCATION_FAILED',
          message: 'Failed to revoke shareable link'
        }
      });
    }
  }

  /**
   * Access report via shareable link
   * GET /api/reporting/export/shared/:linkId
   */
  async getSharedReport(req: Request, res: Response): Promise<void> {
    try {
      const { linkId } = req.params;

      if (!linkId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_LINK_ID',
            message: 'Link ID is required'
          }
        });
        return;
      }

      logger.info('Accessing shared report', { linkId });

      const report = await this.exportService.getReportByShareableLink(linkId);

      if (!report) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SHARED_REPORT_NOT_FOUND',
            message: 'Shared report not found, expired, or access limit exceeded'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: report,
        message: 'Shared report retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get shared report', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SHARED_REPORT_ACCESS_FAILED',
          message: 'Failed to access shared report'
        }
      });
    }
  }

  /**
   * Get export history for user
   * GET /api/reporting/export/history/:userId
   */
  async getExportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      logger.info('Getting export history', { userId, limit, offset });

      // In a real implementation, this would query the database
      const mockHistory = [
        {
          id: 'export_1',
          userId,
          reportId: 'report_123',
          format: 'pdf',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          downloadUrl: 'https://example.com/download/report_123.pdf',
          fileSize: 1024000
        },
        {
          id: 'export_2',
          userId,
          reportId: 'report_124',
          format: 'json',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          downloadUrl: 'https://example.com/download/report_124.json',
          fileSize: 512000
        }
      ];

      const paginatedHistory = mockHistory.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          exports: paginatedHistory,
          total: mockHistory.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        },
        message: 'Export history retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get export history', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_HISTORY_FAILED',
          message: 'Failed to retrieve export history'
        }
      });
    }
  }

  /**
   * Get export statistics
   * GET /api/reporting/export/stats/:userId
   */
  async getExportStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required'
          }
        });
        return;
      }

      logger.info('Getting export statistics', { userId });

      // In a real implementation, this would aggregate data from the database
      const mockStats = {
        totalExports: 15,
        exportsByFormat: {
          pdf: 8,
          json: 4,
          csv: 3
        },
        totalSharedLinks: 5,
        activeSharedLinks: 2,
        totalDownloads: 23,
        lastExportDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        mostUsedFormat: 'pdf',
        averageFileSize: 750000
      };

      res.json({
        success: true,
        data: mockStats,
        message: 'Export statistics retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get export statistics', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_STATS_FAILED',
          message: 'Failed to retrieve export statistics'
        }
      });
    }
  }
}