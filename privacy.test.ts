import { DefaultPrivacyService, PrivacySettings, ConsentRecord } from '../services/privacy-service';
import { PrivacyController } from '../controllers/privacy-controller';
import { Request, Response } from 'express';

describe('Privacy Service', () => {
  let privacyService: DefaultPrivacyService;

  beforeEach(() => {
    privacyService = new DefaultPrivacyService();
  });

  describe('Privacy Settings Management', () => {
    it('should create default privacy settings for new user', async () => {
      const userId = 'new-user-123';
      
      const settings = await privacyService.getPrivacySettings(userId);
      
      expect(settings.userId).toBe(userId);
      expect(settings.dataRetention.retentionPeriodDays).toBe(365);
      expect(settings.dataSharing.allowAnalytics).toBe(false);
      expect(settings.notifications.dataProcessing).toBe(true);
      expect(settings.consentHistory).toEqual([]);
    });

    it('should update privacy settings correctly', async () => {
      const userId = 'test-user-123';
      
      const updates = {
        dataRetention: {
          interviewRecordings: false,
          performanceReports: true,
          personalData: true,
          retentionPeriodDays: 180,
        },
        dataSharing: {
          allowAnalytics: true,
          allowImprovement: true,
          allowMarketing: false,
        },
      };

      const updatedSettings = await privacyService.updatePrivacySettings(userId, updates);
      
      expect(updatedSettings.dataRetention.retentionPeriodDays).toBe(180);
      expect(updatedSettings.dataRetention.interviewRecordings).toBe(false);
      expect(updatedSettings.dataSharing.allowAnalytics).toBe(true);
      expect(updatedSettings.lastUpdated).toBeInstanceOf(Date);
    });

    it('should preserve existing settings when updating partial settings', async () => {
      const userId = 'test-user-456';
      
      // Get initial settings
      const initialSettings = await privacyService.getPrivacySettings(userId);
      
      // Update only notifications
      const updates = {
        notifications: {
          dataProcessing: false,
          policyUpdates: false,
          securityAlerts: true,
        },
      };

      const updatedSettings = await privacyService.updatePrivacySettings(userId, updates);
      
      // Check that other settings are preserved
      expect(updatedSettings.dataRetention).toEqual(initialSettings.dataRetention);
      expect(updatedSettings.dataSharing).toEqual(initialSettings.dataSharing);
      
      // Check that notifications were updated
      expect(updatedSettings.notifications.dataProcessing).toBe(false);
      expect(updatedSettings.notifications.policyUpdates).toBe(false);
      expect(updatedSettings.notifications.securityAlerts).toBe(true);
    });
  });

  describe('Consent Management', () => {
    it('should record user consent correctly', async () => {
      const userId = 'consent-user-123';
      
      const consentData = {
        consentType: 'data_processing' as const,
        granted: true,
        version: '1.0',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const consent = await privacyService.recordConsent(userId, consentData);
      
      expect(consent.id).toBeDefined();
      expect(consent.consentType).toBe('data_processing');
      expect(consent.granted).toBe(true);
      expect(consent.version).toBe('1.0');
      expect(consent.timestamp).toBeInstanceOf(Date);
      expect(consent.ipAddress).toBe('192.168.1.1');
    });

    it('should add consent to user settings history', async () => {
      const userId = 'consent-user-456';
      
      await privacyService.recordConsent(userId, {
        consentType: 'analytics',
        granted: true,
        version: '1.0',
      });

      await privacyService.recordConsent(userId, {
        consentType: 'marketing',
        granted: false,
        version: '1.0',
      });

      const settings = await privacyService.getPrivacySettings(userId);
      
      expect(settings.consentHistory).toHaveLength(2);
      expect(settings.consentHistory[0].consentType).toBe('analytics');
      expect(settings.consentHistory[0].granted).toBe(true);
      expect(settings.consentHistory[1].consentType).toBe('marketing');
      expect(settings.consentHistory[1].granted).toBe(false);
    });

    it('should validate consent correctly', async () => {
      const userId = 'consent-validation-user';
      
      // Record consent
      await privacyService.recordConsent(userId, {
        consentType: 'data_processing',
        granted: true,
        version: '1.0',
      });

      // Validate consent
      const isValid = await privacyService.validateConsent(userId, 'data_processing');
      const isInvalid = await privacyService.validateConsent(userId, 'marketing');
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Data Deletion (Right to Erasure)', () => {
    it('should create data deletion request', async () => {
      const userId = 'deletion-user-123';
      
      const requestData = {
        userId,
        requestType: 'full_deletion' as const,
        dataTypes: ['interview_recordings', 'performance_reports'],
        reason: 'No longer using the service',
      };

      const request = await privacyService.requestDataDeletion(userId, requestData);
      
      expect(request.id).toBeDefined();
      expect(request.userId).toBe(userId);
      expect(request.requestType).toBe('full_deletion');
      expect(request.dataTypes).toEqual(['interview_recordings', 'performance_reports']);
      expect(request.status).toBe('pending');
      expect(request.requestedAt).toBeInstanceOf(Date);
      expect(request.verificationToken).toBeDefined();
    });

    it('should process data deletion request successfully', async () => {
      const userId = 'deletion-user-456';
      
      const request = await privacyService.requestDataDeletion(userId, {
        userId,
        requestType: 'full_deletion',
        dataTypes: ['all'],
      });

      await privacyService.processDataDeletion(request.id);
      
      const processedRequest = await privacyService.getDataDeletionStatus(request.id);
      
      expect(processedRequest.status).toBe('completed');
      expect(processedRequest.processedAt).toBeInstanceOf(Date);
      expect(processedRequest.completedAt).toBeInstanceOf(Date);
    });

    it('should handle anonymization request', async () => {
      const userId = 'anonymization-user';
      
      const request = await privacyService.requestDataDeletion(userId, {
        userId,
        requestType: 'anonymization',
        dataTypes: ['personal_data'],
      });

      await privacyService.processDataDeletion(request.id);
      
      const processedRequest = await privacyService.getDataDeletionStatus(request.id);
      expect(processedRequest.status).toBe('completed');
    });

    it('should throw error for non-existent deletion request', async () => {
      await expect(
        privacyService.getDataDeletionStatus('non-existent-id')
      ).rejects.toThrow('Data deletion request non-existent-id not found');
    });
  });

  describe('Data Export (Right to Portability)', () => {
    it('should create data export request', async () => {
      const userId = 'export-user-123';
      
      const requestData = {
        userId,
        format: 'json' as const,
        dataTypes: ['privacy_settings', 'consent_history'],
      };

      const request = await privacyService.requestDataExport(userId, requestData);
      
      expect(request.id).toBeDefined();
      expect(request.userId).toBe(userId);
      expect(request.format).toBe('json');
      expect(request.dataTypes).toEqual(['privacy_settings', 'consent_history']);
      expect(request.status).toBe('pending');
      expect(request.requestedAt).toBeInstanceOf(Date);
      expect(request.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate data export successfully', async () => {
      const userId = 'export-user-456';
      
      const request = await privacyService.requestDataExport(userId, {
        userId,
        format: 'json',
        dataTypes: ['all'],
      });

      await privacyService.generateDataExport(request.id);
      
      const processedRequest = await privacyService.getDataExportStatus(request.id);
      
      expect(processedRequest.status).toBe('completed');
      expect(processedRequest.completedAt).toBeInstanceOf(Date);
      expect(processedRequest.downloadUrl).toBeDefined();
      expect(processedRequest.downloadUrl).toContain(request.id);
    });

    it('should handle different export formats', async () => {
      const userId = 'export-formats-user';
      
      const formats = ['json', 'csv', 'pdf'] as const;
      
      for (const format of formats) {
        const request = await privacyService.requestDataExport(userId, {
          userId,
          format,
          dataTypes: ['privacy_settings'],
        });

        expect(request.format).toBe(format);
        
        await privacyService.generateDataExport(request.id);
        const processedRequest = await privacyService.getDataExportStatus(request.id);
        
        expect(processedRequest.downloadUrl).toContain(`.${format}`);
      }
    });

    it('should throw error for non-existent export request', async () => {
      await expect(
        privacyService.getDataExportStatus('non-existent-id')
      ).rejects.toThrow('Data export request non-existent-id not found');
    });
  });

  describe('GDPR Compliance', () => {
    it('should generate comprehensive GDPR report', async () => {
      const userId = 'gdpr-user-123';
      
      // Add some consent history
      await privacyService.recordConsent(userId, {
        consentType: 'data_processing',
        granted: true,
        version: '1.0',
      });

      await privacyService.recordConsent(userId, {
        consentType: 'analytics',
        granted: false,
        version: '1.0',
      });

      const report = await privacyService.generateGDPRReport(userId);
      
      expect(report.userId).toBe(userId);
      expect(report.dataProcessingActivities).toBeInstanceOf(Array);
      expect(report.dataProcessingActivities.length).toBeGreaterThan(0);
      expect(report.legalBasis).toContain('consent');
      expect(report.dataRetentionStatus.retentionCompliance).toBe(true);
      expect(report.consentStatus.currentConsents).toHaveLength(1);
      expect(report.consentStatus.withdrawnConsents).toHaveLength(1);
      expect(report.consentStatus.consentRate).toBe(0.5);
      expect(report.lastAuditDate).toBeInstanceOf(Date);
    });

    it('should validate data processing consent', async () => {
      const userId = 'processing-validation-user';
      
      // No consent recorded - should be invalid
      let isValid = await privacyService.validateDataProcessing(userId);
      expect(isValid).toBe(false);
      
      // Record valid consent
      await privacyService.recordConsent(userId, {
        consentType: 'data_processing',
        granted: true,
        version: '1.0',
      });

      isValid = await privacyService.validateDataProcessing(userId);
      expect(isValid).toBe(true);
    });

    it('should anonymize user data correctly', async () => {
      const userId = 'anonymization-test-user';
      
      // Add some consent history with personal data
      await privacyService.recordConsent(userId, {
        consentType: 'data_processing',
        granted: true,
        version: '1.0',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
      });

      await privacyService.anonymizeUserData(userId);
      
      const settings = await privacyService.getPrivacySettings(userId);
      
      // Check that IP address is hashed
      expect(settings.consentHistory[0].ipAddress).not.toBe('192.168.1.100');
      expect(settings.consentHistory[0].ipAddress).toBeDefined();
      
      // Check that user agent is anonymized
      expect(settings.consentHistory[0].userAgent).toBe('anonymized');
    });

    it('should get data processing activities', async () => {
      const userId = 'activities-user';
      
      const activities = await privacyService.getDataProcessingActivities(userId);
      
      expect(activities).toBeInstanceOf(Array);
      expect(activities.length).toBeGreaterThan(0);
      
      activities.forEach(activity => {
        expect(activity.id).toBeDefined();
        expect(activity.purpose).toBeDefined();
        expect(activity.dataTypes).toBeInstanceOf(Array);
        expect(activity.legalBasis).toBeDefined();
        expect(typeof activity.retentionPeriod).toBe('number');
        expect(typeof activity.isActive).toBe('boolean');
      });
    });
  });

  describe('Privacy Utilities', () => {
    it('should hash personal data consistently', () => {
      const data = 'sensitive-personal-data';
      
      const hash1 = privacyService.hashPersonalData(data);
      const hash2 = privacyService.hashPersonalData(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(data);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should hash different data to different values', () => {
      const data1 = 'data-one';
      const data2 = 'data-two';
      
      const hash1 = privacyService.hashPersonalData(data1);
      const hash2 = privacyService.hashPersonalData(data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Privacy Controller', () => {
  let privacyController: PrivacyController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    privacyController = new PrivacyController();
    
    mockReq = {
      user: { id: 'test-user-123', email: 'test@example.com', role: 'user' },
      body: {},
      params: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getPrivacySettings', () => {
    it('should return privacy settings for authenticated user', async () => {
      await privacyController.getPrivacySettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            settings: expect.objectContaining({
              userId: 'test-user-123',
              dataRetention: expect.any(Object),
              dataSharing: expect.any(Object),
              notifications: expect.any(Object),
            }),
          }),
        })
      );
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;
      
      await privacyController.getPrivacySettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update privacy settings successfully', async () => {
      mockReq.body = {
        dataRetention: {
          retentionPeriodDays: 180,
        },
        dataSharing: {
          allowAnalytics: true,
        },
      };

      await privacyController.updatePrivacySettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            settings: expect.any(Object),
            message: 'Privacy settings updated successfully',
          }),
        })
      );
    });

    it('should validate request body', async () => {
      mockReq.body = null;

      await privacyController.updatePrivacySettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_INPUT',
          }),
        })
      );
    });
  });

  describe('recordConsent', () => {
    it('should record consent successfully', async () => {
      mockReq.body = {
        consentType: 'data_processing',
        granted: true,
        version: '1.0',
      };

      await privacyController.recordConsent(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            consent: expect.objectContaining({
              consentType: 'data_processing',
              granted: true,
              version: '1.0',
            }),
            message: 'Consent recorded successfully',
          }),
        })
      );
    });

    it('should validate consent data', async () => {
      mockReq.body = {
        consentType: 'data_processing',
        // Missing granted and version
      };

      await privacyController.recordConsent(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_INPUT',
          }),
        })
      );
    });
  });

  describe('requestDataDeletion', () => {
    it('should create data deletion request', async () => {
      mockReq.body = {
        requestType: 'full_deletion',
        dataTypes: ['interview_recordings', 'performance_reports'],
        reason: 'No longer using service',
      };

      await privacyController.requestDataDeletion(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            request: expect.objectContaining({
              requestType: 'full_deletion',
              dataTypes: ['interview_recordings', 'performance_reports'],
              status: 'pending',
            }),
            message: 'Data deletion request submitted successfully',
          }),
        })
      );
    });

    it('should validate request type', async () => {
      mockReq.body = {
        requestType: 'invalid_type',
        dataTypes: ['all'],
      };

      await privacyController.requestDataDeletion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_INPUT',
            message: 'Invalid request type',
          }),
        })
      );
    });
  });

  describe('requestDataExport', () => {
    it('should create data export request', async () => {
      mockReq.body = {
        format: 'json',
        dataTypes: ['privacy_settings', 'consent_history'],
      };

      await privacyController.requestDataExport(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            request: expect.objectContaining({
              format: 'json',
              dataTypes: ['privacy_settings', 'consent_history'],
              status: 'pending',
            }),
            message: 'Data export request submitted successfully',
          }),
        })
      );
    });

    it('should validate export format', async () => {
      mockReq.body = {
        format: 'invalid_format',
        dataTypes: ['all'],
      };

      await privacyController.requestDataExport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_INPUT',
            message: 'Invalid export format',
          }),
        })
      );
    });
  });

  describe('generateGDPRReport', () => {
    it('should generate GDPR compliance report', async () => {
      await privacyController.generateGDPRReport(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            report: expect.objectContaining({
              userId: 'test-user-123',
              dataProcessingActivities: expect.any(Array),
              legalBasis: expect.any(Array),
              dataRetentionStatus: expect.any(Object),
              userRights: expect.any(Object),
              consentStatus: expect.any(Object),
            }),
          }),
        })
      );
    });
  });

  describe('processDataDeletion', () => {
    it('should process deletion request for admin', async () => {
      mockReq.user.role = 'admin';
      
      // First create a deletion request using the controller's service
      mockReq.body = {
        requestType: 'full_deletion',
        dataTypes: ['all'],
      };
      
      // Create the deletion request first
      await privacyController.requestDataDeletion(mockReq, mockRes);
      
      // Get the request ID from the response
      const createResponse = (mockRes.json as jest.Mock).mock.calls[0][0];
      const requestId = createResponse.data.request.id;
      
      // Reset mocks
      (mockRes.json as jest.Mock).mockClear();
      (mockRes.status as jest.Mock).mockClear();
      
      // Now process the deletion
      mockReq.params.requestId = requestId;

      await privacyController.processDataDeletion(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'Data deletion processed successfully',
            requestId: requestId,
          }),
        })
      );
    });

    it('should deny access to non-admin users', async () => {
      mockReq.user.role = 'user';
      mockReq.params.requestId = 'test-request-id';

      await privacyController.processDataDeletion(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
          }),
        })
      );
    });
  });
});