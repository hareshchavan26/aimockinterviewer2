import { Request, Response } from 'express';
import { DefaultPrivacyService, PrivacySettings, DataDeletionRequest, DataExportRequest } from '../services/privacy-service';
import { AuthenticatedRequest } from '../middleware/security-middleware';
import { logger } from '../utils/logger';

export class PrivacyController {
  private privacyService: DefaultPrivacyService;

  constructor() {
    this.privacyService = new DefaultPrivacyService();
  }

  // Get user's privacy settings
  getPrivacySettings = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const settings = await this.privacyService.getPrivacySettings(userId);

      res.json({
        success: true,
        data: {
          settings,
        },
      });
    } catch (error) {
      logger.error('Failed to get privacy settings', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve privacy settings',
        },
      });
    }
  };

  // Update user's privacy settings
  updatePrivacySettings = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const updates = req.body;

      // Validate required fields
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Privacy settings updates are required',
          },
        });
      }

      const updatedSettings = await this.privacyService.updatePrivacySettings(userId, updates);

      res.json({
        success: true,
        data: {
          settings: updatedSettings,
          message: 'Privacy settings updated successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to update privacy settings', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update privacy settings',
        },
      });
    }
  };

  // Record user consent
  recordConsent = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { consentType, granted, version } = req.body;

      if (!consentType || typeof granted !== 'boolean' || !version) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Consent type, granted status, and version are required',
          },
        });
      }

      const consent = await this.privacyService.recordConsent(userId, {
        consentType,
        granted,
        version,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        data: {
          consent,
          message: 'Consent recorded successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to record consent', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record consent',
        },
      });
    }
  };

  // Request data deletion (Right to Erasure)
  requestDataDeletion = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { requestType, dataTypes, reason } = req.body;

      if (!requestType || !dataTypes || !Array.isArray(dataTypes)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Request type and data types are required',
          },
        });
      }

      const validRequestTypes = ['full_deletion', 'partial_deletion', 'anonymization'];
      if (!validRequestTypes.includes(requestType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid request type',
          },
        });
      }

      const deletionRequest = await this.privacyService.requestDataDeletion(userId, {
        userId,
        requestType,
        dataTypes,
        reason,
      });

      res.json({
        success: true,
        data: {
          request: deletionRequest,
          message: 'Data deletion request submitted successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to request data deletion', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit data deletion request',
        },
      });
    }
  };

  // Get data deletion request status
  getDataDeletionStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { requestId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Request ID is required',
          },
        });
      }

      const request = await this.privacyService.getDataDeletionStatus(requestId);

      // Ensure user can only access their own requests
      if (request.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
      }

      res.json({
        success: true,
        data: {
          request,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Data deletion request not found',
          },
        });
      }

      logger.error('Failed to get data deletion status', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve data deletion status',
        },
      });
    }
  };

  // Request data export (Right to Portability)
  requestDataExport = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { format, dataTypes } = req.body;

      if (!format || !dataTypes || !Array.isArray(dataTypes)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Format and data types are required',
          },
        });
      }

      const validFormats = ['json', 'csv', 'pdf'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid export format',
          },
        });
      }

      const exportRequest = await this.privacyService.requestDataExport(userId, {
        userId,
        format,
        dataTypes,
      });

      // Start processing the export asynchronously
      setTimeout(() => {
        this.privacyService.generateDataExport(exportRequest.id).catch(error => {
          logger.error('Failed to generate data export', { error, requestId: exportRequest.id });
        });
      }, 0);

      res.json({
        success: true,
        data: {
          request: exportRequest,
          message: 'Data export request submitted successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to request data export', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit data export request',
        },
      });
    }
  };

  // Get data export request status
  getDataExportStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { requestId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Request ID is required',
          },
        });
      }

      const request = await this.privacyService.getDataExportStatus(requestId);

      // Ensure user can only access their own requests
      if (request.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
      }

      res.json({
        success: true,
        data: {
          request,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Data export request not found',
          },
        });
      }

      logger.error('Failed to get data export status', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve data export status',
        },
      });
    }
  };

  // Generate GDPR compliance report
  generateGDPRReport = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const report = await this.privacyService.generateGDPRReport(userId);

      res.json({
        success: true,
        data: {
          report,
        },
      });
    } catch (error) {
      logger.error('Failed to generate GDPR report', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate GDPR compliance report',
        },
      });
    }
  };

  // Validate data processing consent
  validateDataProcessing = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const isValid = await this.privacyService.validateDataProcessing(userId);

      res.json({
        success: true,
        data: {
          isValid,
          message: isValid ? 'Data processing consent is valid' : 'Data processing consent is invalid or expired',
        },
      });
    } catch (error) {
      logger.error('Failed to validate data processing', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate data processing consent',
        },
      });
    }
  };

  // Admin: Process data deletion request
  processDataDeletion = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isAdmin = req.user?.role === 'admin';

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        });
      }

      const { requestId } = req.params;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Request ID is required',
          },
        });
      }

      await this.privacyService.processDataDeletion(requestId);

      res.json({
        success: true,
        data: {
          message: 'Data deletion processed successfully',
          requestId,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Data deletion request not found',
          },
        });
      }

      logger.error('Failed to process data deletion', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process data deletion request',
        },
      });
    }
  };
}