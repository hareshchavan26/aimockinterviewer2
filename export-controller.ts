import { Request, Response } from 'express';
import { 
  DefaultReportExportService,
  ExportOptions,
  ExportResult,
  ShareResult
} from '../services/export-service';
import { logger } from '../utils/logger';
import {
  PerformanceReport,
  InterviewSession
} from '@ai-interview/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ExportController {
  private exportService: DefaultReportExportService;

  constructor() {
    this.exportService = new DefaultReportExportService();
  }

  /**
   * Export single report to PDF
   * POST /api/reporting/exports/pdf
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

      const exportOptions: ExportOptions = {
        format: 'pdf',
        includeTranscript: options?.includeTranscript ?? true,
        includeVisualComponents: options?.includeVisualComponents ?? false,
        includeMetadata: options?.includeMetadata ?? false,
        ...options
      };

      const result = await this.exportService.exportReportToPDF(
        report as PerformanceReport,
        session as InterviewSession,
        exportOptions
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            fileName: result.fileName,
            fileSize: result.fileSize,
            downloadUrl: result.downloadUrl
          },
          message: 'PDF export completed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'PDF_EXPORT_FAILED',
            message: result.error || 'Failed to export PDF'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to export PDF', { error });
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
   * POST /api/reporting/exports/json
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

      const exportOptions: ExportOptions = {
        format: 'json',
        includeTranscript: options?.includeTranscript ?? true,
        includeVisualComponents: options?.includeVisualComponents ?? true,
        includeMetadata: options?.includeMetadata ?? true,
        ...options
      };

      const result = await this.exportService.exportReportToJSON(
        report as PerformanceReport,
        session as InterviewSession,
        exportOptions
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            fileName: result.fileName,
            fileSize: result.fileSize,
            downloadUrl: result.downloadUrl
          },
          message: 'JSON export completed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'JSON_EXPORT_FAILED',
            message: result.error || 'Failed to export JSON'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to export JSON', { error });
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
   * POST /api/reporting/exports/csv
   */
  async exportToCSV(req: Request, res: Response): Promise<void> {
    try {
      const { reports, sessions, options } = req.body;

      if (!reports || !sessions || !Array.isArray(reports) || !Array.isArray(sessions)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_DATA',
            message: 'Reports and sessions arrays are required'
          }
        });
        return;
      }

      if (reports.length !== sessions.length) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISMATCHED_DATA',
            message: 'Reports and sessions arrays must have the same length'
          }
        });
        return;
      }

      logger.info('Exporting reports to CSV', { 
        reportCount: reports.length,
        sessionCount: sessions.length 
      });

      const exportOptions: ExportOptions = {
        format: 'csv',
        includeMetadata: options?.includeMetadata ?? false,
        ...options
      };

      const result = await this.exportService.exportReportToCSV(
        reports as PerformanceReport[],
        sessions as InterviewSession[],
        exportOptions
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            fileName: result.fileName,
            fileSize: result.fileSize,
            downloadUrl: result.downloadUrl,
            recordCount: reports.length
          },
          message: 'CSV export completed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'CSV_EXPORT_FAILED',
            message: result.error || 'Failed to export CSV'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to export CSV', { error });
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
   * Create shareable link for report
   * POST /api/reporting/exports/share
   */
  async createShareableLink(req: Request, res: Response): Promise<void> {
    try {
      const { reportId, userId, expirationHours, maxAccess, password } = req.body;

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

      logger.info('Creating shareable link', { 
        reportId,
        userId,
        expirationHours,
        maxAccess,
        hasPassword: !!password 
      });

      const result = await this.exportService.createShareableLink(
        reportId,
        userId,
        expirationHours,
        maxAccess,
        password
      );

      if (result.success && result.shareableLink) {
        res.json({
          success: true,
          data: {
            linkId: result.shareableLink.id,
            url: result.shareableLink.url,
            expiresAt: result.shareableLink.expiresAt,
            maxAccess: result.shareableLink.maxAccess,
            hasPassword: !!result.shareableLink.password
          },
          message: 'Shareable link created successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'SHARE_LINK_CREATION_FAILED',
            message: result.error || 'Failed to create shareable link'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to create shareable link', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SHARE_LINK_ERROR',
          message: 'Internal error during shareable link creation'
        }
      });
    }
  }

  /**
   * Access shared report
   * GET /api/reporting/exports/shared/:linkId
   */
  async getSharedReport(req: Request, res: Response): Promise<void> {
    try {
      const { linkId } = req.params;
      const { password } = req.query;

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

      logger.info('Accessing shared report', { linkId, hasPassword: !!password });

      const result = await this.exportService.getShareableReport(
        linkId,
        password as string
      );

      if (result.success && result.report && result.session) {
        res.json({
          success: true,
          data: {
            report: result.report,
            session: result.session
          },
          message: 'Shared report retrieved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'SHARED_REPORT_NOT_FOUND',
            message: result.error || 'Shared report not found or expired'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to access shared report', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SHARED_REPORT_ERROR',
          message: 'Internal error accessing shared report'
        }
      });
    }
  }

  /**
   * Revoke shareable link
   * DELETE /api/reporting/exports/share/:linkId
   */
  async revokeShareableLink(req: Request, res: Response): Promise<void> {
    try {
      const { linkId } = req.params;
      const { userId } = req.body;

      if (!linkId || !userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Link ID and User ID are required'
          }
        });
        return;
      }

      logger.info('Revoking shareable link', { linkId, userId });

      const result = await this.exportService.revokeShareableLink(linkId, userId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Shareable link revoked successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'LINK_REVOCATION_FAILED',
            message: result.error || 'Failed to revoke shareable link'
          }
        });
      }

    } catch (error) {
      logger.error('Failed to revoke shareable link', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LINK_REVOCATION_ERROR',
          message: 'Internal error during link revocation'
        }
      });
    }
  }

  /**
   * Get user's export history
   * GET /api/reporting/exports/history/:userId
   */
  async getExportHistory(req: Request, res: Response): Promise<void> {
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

      logger.info('Getting export history', { userId });

      const history = await this.exportService.getExportHistory(userId);

      res.json({
        success: true,
        data: {
          exports: history,
          totalCount: history.length
        },
        message: 'Export history retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get export history', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_HISTORY_ERROR',
          message: 'Failed to retrieve export history'
        }
      });
    }
  }

  /**
   * Get user's active shareable links
   * GET /api/reporting/exports/links/:userId
   */
  async getActiveShareableLinks(req: Request, res: Response): Promise<void> {
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

      logger.info('Getting active shareable links', { userId });

      const links = await this.exportService.getActiveShareableLinks(userId);

      // Remove sensitive information before sending
      const sanitizedLinks = links.map(link => ({
        id: link.id,
        reportId: link.reportId,
        url: link.url,
        expiresAt: link.expiresAt,
        accessCount: link.accessCount,
        maxAccess: link.maxAccess,
        isActive: link.isActive,
        createdAt: link.createdAt,
        hasPassword: !!link.password
      }));

      res.json({
        success: true,
        data: {
          links: sanitizedLinks,
          totalCount: sanitizedLinks.length
        },
        message: 'Active shareable links retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get active shareable links', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SHAREABLE_LINKS_ERROR',
          message: 'Failed to retrieve shareable links'
        }
      });
    }
  }

  /**
   * Download exported file
   * GET /api/reporting/exports/download/:fileName
   */
  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FILE_NAME',
            message: 'File name is required'
          }
        });
        return;
      }

      // Validate file name to prevent directory traversal
      if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_NAME',
            message: 'Invalid file name'
          }
        });
        return;
      }

      const filePath = path.join('./exports', fileName);

      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Requested file not found'
          }
        });
        return;
      }

      logger.info('Downloading file', { fileName });

      // Set appropriate headers based on file type
      const ext = path.extname(fileName).toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.csv':
          contentType = 'text/csv';
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Stream the file
      const fileStream = await fs.readFile(filePath);
      res.send(fileStream);

      logger.info('File downloaded successfully', { fileName });

    } catch (error) {
      logger.error('Failed to download file', { error, fileName: req.params.fileName });
      res.status(500).json({
        success: false,
        error: {
          code: 'FILE_DOWNLOAD_ERROR',
          message: 'Failed to download file'
        }
      });
    }
  }

  /**
   * Get export statistics
   * GET /api/reporting/exports/stats/:userId
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

      const [history, links] = await Promise.all([
        this.exportService.getExportHistory(userId),
        this.exportService.getActiveShareableLinks(userId)
      ]);

      const stats = {
        totalExports: history.length,
        exportsByFormat: {
          pdf: history.filter(h => h.fileName?.endsWith('.pdf')).length,
          json: history.filter(h => h.fileName?.endsWith('.json')).length,
          csv: history.filter(h => h.fileName?.endsWith('.csv')).length
        },
        totalSharedLinks: links.length,
        activeSharedLinks: links.filter(l => l.isActive).length,
        totalSharedAccess: links.reduce((sum, link) => sum + link.accessCount, 0),
        recentExports: history.slice(-5), // Last 5 exports
        recentSharedLinks: links.slice(-3) // Last 3 shared links
      };

      res.json({
        success: true,
        data: stats,
        message: 'Export statistics retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to get export statistics', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_STATS_ERROR',
          message: 'Failed to retrieve export statistics'
        }
      });
    }
  }
}