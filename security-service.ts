import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
}

export interface DecryptionParams {
  encryptedData: string;
  iv: string;
  tag: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface DataRetentionPolicy {
  resourceType: string;
  retentionPeriodDays: number;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
}

export interface SecurityService {
  // Encryption methods
  encrypt(data: string): Promise<EncryptionResult>;
  decrypt(params: DecryptionParams): Promise<string>;
  encryptObject<T>(obj: T): Promise<EncryptionResult>;
  decryptObject<T>(params: DecryptionParams): Promise<T>;
  
  // Audit logging methods
  logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getAuditLogs(userId?: string, startDate?: Date, endDate?: Date): Promise<AuditLogEntry[]>;
  
  // Data retention methods
  setRetentionPolicy(policy: DataRetentionPolicy): Promise<void>;
  getRetentionPolicies(): Promise<DataRetentionPolicy[]>;
  enforceRetentionPolicies(): Promise<void>;
  
  // Security utilities
  hashSensitiveData(data: string): string;
  generateSecureToken(): string;
  validateDataIntegrity(data: string, hash: string): boolean;
}

export class DefaultSecurityService implements SecurityService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-cbc';
  private readonly auditLogs: Map<string, AuditLogEntry> = new Map();
  private readonly retentionPolicies: Map<string, DataRetentionPolicy> = new Map();

  constructor() {
    // In production, this should come from environment variables or key management service
    const keyString = process.env.ENCRYPTION_KEY || 'default-key-for-development-only-32b';
    this.encryptionKey = Buffer.from(keyString.padEnd(32, '0').slice(0, 32));
    
    // Set default retention policies
    this.initializeDefaultRetentionPolicies();
  }

  private initializeDefaultRetentionPolicies(): void {
    const defaultPolicies: DataRetentionPolicy[] = [
      {
        resourceType: 'interview_sessions',
        retentionPeriodDays: 365, // 1 year
        autoDelete: true,
        archiveBeforeDelete: true,
      },
      {
        resourceType: 'performance_reports',
        retentionPeriodDays: 730, // 2 years
        autoDelete: true,
        archiveBeforeDelete: true,
      },
      {
        resourceType: 'audit_logs',
        retentionPeriodDays: 2555, // 7 years (compliance requirement)
        autoDelete: false,
        archiveBeforeDelete: true,
      },
      {
        resourceType: 'user_recordings',
        retentionPeriodDays: 90, // 3 months
        autoDelete: true,
        archiveBeforeDelete: false,
      },
      {
        resourceType: 'temporary_exports',
        retentionPeriodDays: 7, // 1 week
        autoDelete: true,
        archiveBeforeDelete: false,
      },
    ];

    defaultPolicies.forEach(policy => {
      this.retentionPolicies.set(policy.resourceType, policy);
    });
  }

  async encrypt(data: string): Promise<EncryptionResult> {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      let encryptedData = cipher.update(data, 'utf8', 'hex');
      encryptedData += cipher.final('hex');

      return {
        encryptedData,
        iv: iv.toString('hex'),
        tag: '', // Not used in CBC mode
      };
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(params: DecryptionParams): Promise<string> {
    try {
      const { encryptedData, iv } = params;
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, Buffer.from(iv, 'hex'));

      let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
      decryptedData += decipher.final('utf8');

      return decryptedData;
    } catch (error) {
      logger.error('Decryption failed', { error });
      throw new Error('Failed to decrypt data');
    }
  }

  async encryptObject<T>(obj: T): Promise<EncryptionResult> {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  async decryptObject<T>(params: DecryptionParams): Promise<T> {
    const jsonString = await this.decrypt(params);
    return JSON.parse(jsonString) as T;
  }

  async logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: this.generateSecureToken(),
      timestamp: new Date(),
    };

    // Store in memory (in production, this would go to a secure database)
    this.auditLogs.set(auditEntry.id, auditEntry);

    // Log to application logger as well
    logger.info('Audit event logged', {
      auditId: auditEntry.id,
      userId: auditEntry.userId,
      action: auditEntry.action,
      resource: auditEntry.resource,
      success: auditEntry.success,
    });

    // In production, you might also send to external audit systems
    await this.sendToExternalAuditSystem(auditEntry);
  }

  private async sendToExternalAuditSystem(entry: AuditLogEntry): Promise<void> {
    // Placeholder for external audit system integration
    // This could be AWS CloudTrail, Splunk, or other audit systems
    logger.debug('Audit entry would be sent to external system', { auditId: entry.id });
  }

  async getAuditLogs(userId?: string, startDate?: Date, endDate?: Date): Promise<AuditLogEntry[]> {
    let logs = Array.from(this.auditLogs.values());

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async setRetentionPolicy(policy: DataRetentionPolicy): Promise<void> {
    this.retentionPolicies.set(policy.resourceType, policy);
    
    logger.info('Data retention policy updated', {
      resourceType: policy.resourceType,
      retentionPeriodDays: policy.retentionPeriodDays,
      autoDelete: policy.autoDelete,
    });
  }

  async getRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    return Array.from(this.retentionPolicies.values());
  }

  async enforceRetentionPolicies(): Promise<void> {
    const policies = await this.getRetentionPolicies();
    const now = new Date();

    for (const policy of policies) {
      if (!policy.autoDelete) {
        continue;
      }

      const cutoffDate = new Date(now.getTime() - (policy.retentionPeriodDays * 24 * 60 * 60 * 1000));
      
      logger.info('Enforcing retention policy', {
        resourceType: policy.resourceType,
        cutoffDate: cutoffDate.toISOString(),
        retentionPeriodDays: policy.retentionPeriodDays,
      });

      // In production, this would query the database and delete/archive old records
      await this.cleanupExpiredData(policy.resourceType, cutoffDate, policy.archiveBeforeDelete);
    }
  }

  private async cleanupExpiredData(resourceType: string, cutoffDate: Date, archiveFirst: boolean): Promise<void> {
    // Placeholder for actual data cleanup logic
    // This would involve database queries to find and remove/archive old data
    
    if (archiveFirst) {
      logger.info('Archiving expired data before deletion', { resourceType, cutoffDate });
      // Archive logic would go here
    }

    logger.info('Cleaning up expired data', { resourceType, cutoffDate });
    // Cleanup logic would go here
  }

  hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateDataIntegrity(data: string, hash: string): boolean {
    const computedHash = this.hashSensitiveData(data);
    // Ensure both hashes are the same length before comparison
    if (computedHash.length !== hash.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
  }
}