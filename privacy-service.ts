import { logger } from '../utils/logger';
import { DefaultSecurityService } from './security-service';

export interface PrivacySettings {
  userId: string;
  dataRetention: {
    interviewRecordings: boolean;
    performanceReports: boolean;
    personalData: boolean;
    retentionPeriodDays: number;
  };
  dataSharing: {
    allowAnalytics: boolean;
    allowImprovement: boolean;
    allowMarketing: boolean;
  };
  notifications: {
    dataProcessing: boolean;
    policyUpdates: boolean;
    securityAlerts: boolean;
  };
  consentHistory: ConsentRecord[];
  lastUpdated: Date;
}

export interface ConsentRecord {
  id: string;
  consentType: 'data_processing' | 'analytics' | 'marketing' | 'data_retention';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Privacy policy version
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestType: 'full_deletion' | 'partial_deletion' | 'anonymization';
  dataTypes: string[];
  reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  verificationToken?: string;
  metadata?: Record<string, any>;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  format: 'json' | 'csv' | 'pdf';
  dataTypes: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface GDPRComplianceReport {
  userId: string;
  dataProcessingActivities: DataProcessingActivity[];
  legalBasis: string[];
  dataRetentionStatus: DataRetentionStatus;
  userRights: UserRightsStatus;
  consentStatus: ConsentStatus;
  lastAuditDate: Date;
}

export interface DataProcessingActivity {
  id: string;
  purpose: string;
  dataTypes: string[];
  legalBasis: string;
  retentionPeriod: number;
  isActive: boolean;
}

export interface DataRetentionStatus {
  totalDataSize: number;
  oldestRecord: Date;
  retentionCompliance: boolean;
  scheduledDeletions: Date[];
}

export interface UserRightsStatus {
  accessRequests: number;
  rectificationRequests: number;
  erasureRequests: number;
  portabilityRequests: number;
  objectionRequests: number;
  lastExercised?: Date;
}

export interface ConsentStatus {
  currentConsents: ConsentRecord[];
  withdrawnConsents: ConsentRecord[];
  consentRate: number;
  lastConsentUpdate: Date;
}

export interface PrivacyService {
  // Privacy Settings Management
  getPrivacySettings(userId: string): Promise<PrivacySettings>;
  updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings>;
  recordConsent(userId: string, consent: Omit<ConsentRecord, 'id' | 'timestamp'>): Promise<ConsentRecord>;
  
  // Data Deletion (Right to Erasure)
  requestDataDeletion(userId: string, request: Omit<DataDeletionRequest, 'id' | 'status' | 'requestedAt'>): Promise<DataDeletionRequest>;
  processDataDeletion(requestId: string): Promise<void>;
  getDataDeletionStatus(requestId: string): Promise<DataDeletionRequest>;
  
  // Data Export (Right to Portability)
  requestDataExport(userId: string, request: Omit<DataExportRequest, 'id' | 'status' | 'requestedAt'>): Promise<DataExportRequest>;
  generateDataExport(requestId: string): Promise<void>;
  getDataExportStatus(requestId: string): Promise<DataExportRequest>;
  
  // GDPR Compliance
  generateGDPRReport(userId: string): Promise<GDPRComplianceReport>;
  anonymizeUserData(userId: string): Promise<void>;
  validateDataProcessing(userId: string): Promise<boolean>;
  
  // Privacy Utilities
  hashPersonalData(data: string): string;
  validateConsent(userId: string, consentType: string): Promise<boolean>;
  getDataProcessingActivities(userId: string): Promise<DataProcessingActivity[]>;
}

export class DefaultPrivacyService implements PrivacyService {
  private securityService: DefaultSecurityService;
  private privacySettings: Map<string, PrivacySettings> = new Map();
  private deletionRequests: Map<string, DataDeletionRequest> = new Map();
  private exportRequests: Map<string, DataExportRequest> = new Map();

  constructor() {
    this.securityService = new DefaultSecurityService();
    this.initializeDefaultSettings();
  }

  private initializeDefaultSettings(): void {
    // Initialize with sample data for testing
    const defaultSettings: PrivacySettings = {
      userId: 'default',
      dataRetention: {
        interviewRecordings: true,
        performanceReports: true,
        personalData: true,
        retentionPeriodDays: 365,
      },
      dataSharing: {
        allowAnalytics: false,
        allowImprovement: true,
        allowMarketing: false,
      },
      notifications: {
        dataProcessing: true,
        policyUpdates: true,
        securityAlerts: true,
      },
      consentHistory: [],
      lastUpdated: new Date(),
    };

    this.privacySettings.set('default', defaultSettings);
  }

  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    const settings = this.privacySettings.get(userId);
    
    if (!settings) {
      // Create default settings for new user
      const defaultSettings: PrivacySettings = {
        userId,
        dataRetention: {
          interviewRecordings: true,
          performanceReports: true,
          personalData: true,
          retentionPeriodDays: 365,
        },
        dataSharing: {
          allowAnalytics: false,
          allowImprovement: true,
          allowMarketing: false,
        },
        notifications: {
          dataProcessing: true,
          policyUpdates: true,
          securityAlerts: true,
        },
        consentHistory: [],
        lastUpdated: new Date(),
      };

      this.privacySettings.set(userId, defaultSettings);
      
      await this.securityService.logAuditEvent({
        userId,
        action: 'PRIVACY_SETTINGS_CREATED',
        resource: 'privacy_settings',
        metadata: { defaultSettings: true },
        success: true,
      });

      return defaultSettings;
    }

    return settings;
  }

  async updatePrivacySettings(userId: string, updates: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const currentSettings = await this.getPrivacySettings(userId);
    
    const updatedSettings: PrivacySettings = {
      ...currentSettings,
      ...updates,
      userId, // Ensure userId cannot be changed
      lastUpdated: new Date(),
    };

    this.privacySettings.set(userId, updatedSettings);

    await this.securityService.logAuditEvent({
      userId,
      action: 'PRIVACY_SETTINGS_UPDATED',
      resource: 'privacy_settings',
      metadata: {
        updatedFields: Object.keys(updates),
        previousSettings: currentSettings,
        newSettings: updatedSettings,
      },
      success: true,
    });

    logger.info('Privacy settings updated', { userId, updatedFields: Object.keys(updates) });
    
    return updatedSettings;
  }

  async recordConsent(userId: string, consentData: Omit<ConsentRecord, 'id' | 'timestamp'>): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      ...consentData,
      id: this.securityService.generateSecureToken(),
      timestamp: new Date(),
    };

    const settings = await this.getPrivacySettings(userId);
    settings.consentHistory.push(consent);
    settings.lastUpdated = new Date();
    
    this.privacySettings.set(userId, settings);

    await this.securityService.logAuditEvent({
      userId,
      action: 'CONSENT_RECORDED',
      resource: 'user_consent',
      resourceId: consent.id,
      metadata: {
        consentType: consent.consentType,
        granted: consent.granted,
        version: consent.version,
      },
      success: true,
    });

    logger.info('User consent recorded', { 
      userId, 
      consentType: consent.consentType, 
      granted: consent.granted 
    });

    return consent;
  }

  async requestDataDeletion(userId: string, requestData: Omit<DataDeletionRequest, 'id' | 'status' | 'requestedAt'>): Promise<DataDeletionRequest> {
    const request: DataDeletionRequest = {
      ...requestData,
      id: this.securityService.generateSecureToken(),
      status: 'pending',
      requestedAt: new Date(),
      verificationToken: this.securityService.generateSecureToken(),
    };

    this.deletionRequests.set(request.id, request);

    await this.securityService.logAuditEvent({
      userId,
      action: 'DATA_DELETION_REQUESTED',
      resource: 'data_deletion_request',
      resourceId: request.id,
      metadata: {
        requestType: request.requestType,
        dataTypes: request.dataTypes,
        reason: request.reason,
      },
      success: true,
    });

    logger.info('Data deletion requested', { 
      userId, 
      requestId: request.id, 
      requestType: request.requestType 
    });

    return request;
  }

  async processDataDeletion(requestId: string): Promise<void> {
    const request = this.deletionRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Data deletion request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Data deletion request ${requestId} is not in pending status`);
    }

    // Update status to processing
    request.status = 'processing';
    request.processedAt = new Date();
    this.deletionRequests.set(requestId, request);

    try {
      // Simulate data deletion process
      await this.performDataDeletion(request);

      // Update status to completed
      request.status = 'completed';
      request.completedAt = new Date();
      this.deletionRequests.set(requestId, request);

      await this.securityService.logAuditEvent({
        userId: request.userId,
        action: 'DATA_DELETION_COMPLETED',
        resource: 'data_deletion_request',
        resourceId: requestId,
        metadata: {
          requestType: request.requestType,
          dataTypes: request.dataTypes,
          processingTime: request.completedAt.getTime() - request.processedAt!.getTime(),
        },
        success: true,
      });

      logger.info('Data deletion completed', { 
        userId: request.userId, 
        requestId, 
        requestType: request.requestType 
      });

    } catch (error) {
      request.status = 'failed';
      request.metadata = { 
        ...request.metadata, 
        error: error instanceof Error ? error.message : String(error) 
      };
      this.deletionRequests.set(requestId, request);

      await this.securityService.logAuditEvent({
        userId: request.userId,
        action: 'DATA_DELETION_FAILED',
        resource: 'data_deletion_request',
        resourceId: requestId,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  private async performDataDeletion(request: DataDeletionRequest): Promise<void> {
    // In a real implementation, this would:
    // 1. Delete user data from all relevant tables
    // 2. Remove or anonymize associated records
    // 3. Clean up file storage (recordings, exports, etc.)
    // 4. Update related records to maintain referential integrity

    logger.info('Performing data deletion', {
      userId: request.userId,
      requestType: request.requestType,
      dataTypes: request.dataTypes,
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    if (request.requestType === 'full_deletion') {
      // Remove privacy settings
      this.privacySettings.delete(request.userId);
    } else if (request.requestType === 'anonymization') {
      // Anonymize user data
      await this.anonymizeUserData(request.userId);
    }
  }

  async getDataDeletionStatus(requestId: string): Promise<DataDeletionRequest> {
    const request = this.deletionRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Data deletion request ${requestId} not found`);
    }

    return request;
  }

  async requestDataExport(userId: string, requestData: Omit<DataExportRequest, 'id' | 'status' | 'requestedAt'>): Promise<DataExportRequest> {
    const request: DataExportRequest = {
      ...requestData,
      id: this.securityService.generateSecureToken(),
      status: 'pending',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    this.exportRequests.set(request.id, request);

    await this.securityService.logAuditEvent({
      userId,
      action: 'DATA_EXPORT_REQUESTED',
      resource: 'data_export_request',
      resourceId: request.id,
      metadata: {
        format: request.format,
        dataTypes: request.dataTypes,
      },
      success: true,
    });

    logger.info('Data export requested', { 
      userId, 
      requestId: request.id, 
      format: request.format 
    });

    return request;
  }

  async generateDataExport(requestId: string): Promise<void> {
    const request = this.exportRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Data export request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Data export request ${requestId} is not in pending status`);
    }

    // Update status to processing
    request.status = 'processing';
    this.exportRequests.set(requestId, request);

    try {
      // Simulate data export generation
      const exportData = await this.generateExportData(request);
      
      // In a real implementation, this would upload to secure storage
      request.downloadUrl = `https://secure-exports.example.com/${requestId}.${request.format}`;
      request.status = 'completed';
      request.completedAt = new Date();
      
      this.exportRequests.set(requestId, request);

      await this.securityService.logAuditEvent({
        userId: request.userId,
        action: 'DATA_EXPORT_COMPLETED',
        resource: 'data_export_request',
        resourceId: requestId,
        metadata: {
          format: request.format,
          dataTypes: request.dataTypes,
          downloadUrl: request.downloadUrl,
        },
        success: true,
      });

      logger.info('Data export completed', { 
        userId: request.userId, 
        requestId, 
        format: request.format 
      });

    } catch (error) {
      request.status = 'failed';
      request.metadata = { 
        ...request.metadata, 
        error: error instanceof Error ? error.message : String(error) 
      };
      this.exportRequests.set(requestId, request);

      throw error;
    }
  }

  private async generateExportData(request: DataExportRequest): Promise<any> {
    // In a real implementation, this would collect all user data
    const userData = {
      userId: request.userId,
      privacySettings: await this.getPrivacySettings(request.userId),
      exportedAt: new Date().toISOString(),
      format: request.format,
      dataTypes: request.dataTypes,
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    return userData;
  }

  async getDataExportStatus(requestId: string): Promise<DataExportRequest> {
    const request = this.exportRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Data export request ${requestId} not found`);
    }

    return request;
  }

  async generateGDPRReport(userId: string): Promise<GDPRComplianceReport> {
    const settings = await this.getPrivacySettings(userId);
    
    const report: GDPRComplianceReport = {
      userId,
      dataProcessingActivities: await this.getDataProcessingActivities(userId),
      legalBasis: ['consent', 'legitimate_interest'],
      dataRetentionStatus: {
        totalDataSize: 1024 * 1024, // 1MB mock data
        oldestRecord: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        retentionCompliance: true,
        scheduledDeletions: [],
      },
      userRights: {
        accessRequests: 0,
        rectificationRequests: 0,
        erasureRequests: Array.from(this.deletionRequests.values())
          .filter(req => req.userId === userId).length,
        portabilityRequests: Array.from(this.exportRequests.values())
          .filter(req => req.userId === userId).length,
        objectionRequests: 0,
      },
      consentStatus: {
        currentConsents: settings.consentHistory.filter(c => c.granted),
        withdrawnConsents: settings.consentHistory.filter(c => !c.granted),
        consentRate: settings.consentHistory.length > 0 ? 
          settings.consentHistory.filter(c => c.granted).length / settings.consentHistory.length : 0,
        lastConsentUpdate: settings.lastUpdated,
      },
      lastAuditDate: new Date(),
    };

    await this.securityService.logAuditEvent({
      userId,
      action: 'GDPR_REPORT_GENERATED',
      resource: 'gdpr_compliance',
      metadata: {
        reportGenerated: true,
        consentRate: report.consentStatus.consentRate,
        dataProcessingActivities: report.dataProcessingActivities.length,
      },
      success: true,
    });

    return report;
  }

  async anonymizeUserData(userId: string): Promise<void> {
    const settings = await this.getPrivacySettings(userId);
    
    // Anonymize personal identifiers while keeping statistical data
    const anonymizedSettings: PrivacySettings = {
      ...settings,
      userId: this.hashPersonalData(userId),
      consentHistory: settings.consentHistory.map(consent => ({
        ...consent,
        ipAddress: consent.ipAddress ? this.hashPersonalData(consent.ipAddress) : undefined,
        userAgent: consent.userAgent ? 'anonymized' : undefined,
      })),
      lastUpdated: new Date(),
    };

    this.privacySettings.set(userId, anonymizedSettings);

    await this.securityService.logAuditEvent({
      userId,
      action: 'USER_DATA_ANONYMIZED',
      resource: 'user_data',
      metadata: {
        anonymizationCompleted: true,
        originalUserId: this.hashPersonalData(userId),
      },
      success: true,
    });

    logger.info('User data anonymized', { userId });
  }

  async validateDataProcessing(userId: string): Promise<boolean> {
    const settings = await this.getPrivacySettings(userId);
    
    // Check if user has valid consent for data processing
    const hasValidConsent = settings.consentHistory.some(consent => 
      consent.consentType === 'data_processing' && 
      consent.granted &&
      consent.timestamp > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Within last year
    );

    return hasValidConsent;
  }

  hashPersonalData(data: string): string {
    return this.securityService.hashSensitiveData(data);
  }

  async validateConsent(userId: string, consentType: string): Promise<boolean> {
    const settings = await this.getPrivacySettings(userId);
    
    const latestConsent = settings.consentHistory
      .filter(consent => consent.consentType === consentType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return latestConsent ? latestConsent.granted : false;
  }

  async getDataProcessingActivities(userId: string): Promise<DataProcessingActivity[]> {
    // Mock data processing activities
    return [
      {
        id: 'interview-analysis',
        purpose: 'Interview performance analysis',
        dataTypes: ['audio_recordings', 'transcripts', 'performance_metrics'],
        legalBasis: 'consent',
        retentionPeriod: 365,
        isActive: true,
      },
      {
        id: 'improvement-recommendations',
        purpose: 'Personalized improvement recommendations',
        dataTypes: ['performance_data', 'user_preferences'],
        legalBasis: 'legitimate_interest',
        retentionPeriod: 730,
        isActive: true,
      },
      {
        id: 'progress-tracking',
        purpose: 'User progress tracking and analytics',
        dataTypes: ['session_data', 'progress_metrics'],
        legalBasis: 'consent',
        retentionPeriod: 365,
        isActive: true,
      },
    ];
  }
}