import { DefaultSecurityService, DataRetentionPolicy } from '../services/security-service';
import { SecurityMiddleware } from '../middleware/security-middleware';
import { SecurityController } from '../controllers/security-controller';
import { Request, Response } from 'express';

describe('Security Service', () => {
  let securityService: DefaultSecurityService;

  beforeEach(() => {
    securityService = new DefaultSecurityService();
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt string data correctly', async () => {
      const originalData = 'sensitive user information';
      
      const encrypted = await securityService.encrypt(originalData);
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.encryptedData).not.toBe(originalData);

      const decrypted = await securityService.decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should encrypt and decrypt object data correctly', async () => {
      const originalObject = {
        userId: '123',
        email: 'user@example.com',
        sensitiveData: 'confidential information',
      };
      
      const encrypted = await securityService.encryptObject(originalObject);
      expect(encrypted.encryptedData).toBeDefined();

      const decrypted = await securityService.decryptObject(encrypted);
      expect(decrypted).toEqual(originalObject);
    });

    it('should handle encryption errors gracefully', async () => {
      // Test with invalid data
      await expect(securityService.decrypt({
        encryptedData: 'invalid',
        iv: 'invalid',
        tag: 'invalid',
      })).rejects.toThrow('Failed to decrypt data');
    });

    it('should generate different encryption results for same input', async () => {
      const data = 'test data';
      
      const encrypted1 = await securityService.encrypt(data);
      const encrypted2 = await securityService.encrypt(data);
      
      // Should be different due to random IV
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both should decrypt to original data
      const decrypted1 = await securityService.decrypt(encrypted1);
      const decrypted2 = await securityService.decrypt(encrypted2);
      expect(decrypted1).toBe(data);
      expect(decrypted2).toBe(data);
    });
  });

  describe('Audit Logging', () => {
    it('should log audit events correctly', async () => {
      const auditEntry = {
        userId: 'user123',
        action: 'LOGIN',
        resource: 'authentication',
        metadata: { method: 'oauth' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
      };

      await securityService.logAuditEvent(auditEntry);

      const logs = await securityService.getAuditLogs('user123');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject(auditEntry);
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should filter audit logs by user ID', async () => {
      await securityService.logAuditEvent({
        userId: 'user1',
        action: 'ACTION1',
        resource: 'resource1',
        success: true,
      });

      await securityService.logAuditEvent({
        userId: 'user2',
        action: 'ACTION2',
        resource: 'resource2',
        success: true,
      });

      const user1Logs = await securityService.getAuditLogs('user1');
      const user2Logs = await securityService.getAuditLogs('user2');

      expect(user1Logs).toHaveLength(1);
      expect(user2Logs).toHaveLength(1);
      expect(user1Logs[0].userId).toBe('user1');
      expect(user2Logs[0].userId).toBe('user2');
    });

    it('should filter audit logs by date range', async () => {
      const now = new Date();
      
      await securityService.logAuditEvent({
        userId: 'user1',
        action: 'OLD_ACTION',
        resource: 'resource1',
        success: true,
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const cutoffTime = new Date();

      await securityService.logAuditEvent({
        userId: 'user1',
        action: 'NEW_ACTION',
        resource: 'resource1',
        success: true,
      });

      const recentLogs = await securityService.getAuditLogs('user1', cutoffTime);
      const allLogs = await securityService.getAuditLogs('user1');

      expect(allLogs).toHaveLength(2);
      expect(recentLogs).toHaveLength(1);
      expect(recentLogs[0].action).toBe('NEW_ACTION');
    });

    it('should sort audit logs by timestamp descending', async () => {
      await securityService.logAuditEvent({
        userId: 'user1',
        action: 'FIRST_ACTION',
        resource: 'resource1',
        success: true,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await securityService.logAuditEvent({
        userId: 'user1',
        action: 'SECOND_ACTION',
        resource: 'resource1',
        success: true,
      });

      const logs = await securityService.getAuditLogs('user1');
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('SECOND_ACTION'); // Most recent first
      expect(logs[1].action).toBe('FIRST_ACTION');
    });
  });

  describe('Data Retention Policies', () => {
    it('should set and get retention policies', async () => {
      const policy: DataRetentionPolicy = {
        resourceType: 'test_data',
        retentionPeriodDays: 90,
        autoDelete: true,
        archiveBeforeDelete: false,
      };

      await securityService.setRetentionPolicy(policy);
      const policies = await securityService.getRetentionPolicies();

      const testPolicy = policies.find(p => p.resourceType === 'test_data');
      expect(testPolicy).toEqual(policy);
    });

    it('should have default retention policies', async () => {
      const policies = await securityService.getRetentionPolicies();
      
      expect(policies.length).toBeGreaterThan(0);
      
      const expectedTypes = [
        'interview_sessions',
        'performance_reports',
        'audit_logs',
        'user_recordings',
        'temporary_exports',
      ];

      expectedTypes.forEach(type => {
        const policy = policies.find(p => p.resourceType === type);
        expect(policy).toBeDefined();
        expect(policy!.retentionPeriodDays).toBeGreaterThan(0);
      });
    });

    it('should enforce retention policies', async () => {
      const policy: DataRetentionPolicy = {
        resourceType: 'test_cleanup',
        retentionPeriodDays: 1,
        autoDelete: true,
        archiveBeforeDelete: false,
      };

      await securityService.setRetentionPolicy(policy);
      
      // This should not throw an error
      await expect(securityService.enforceRetentionPolicies()).resolves.not.toThrow();
    });

    it('should not auto-delete when autoDelete is false', async () => {
      const policy: DataRetentionPolicy = {
        resourceType: 'permanent_data',
        retentionPeriodDays: 1,
        autoDelete: false,
        archiveBeforeDelete: true,
      };

      await securityService.setRetentionPolicy(policy);
      
      // Should complete without errors even with autoDelete false
      await expect(securityService.enforceRetentionPolicies()).resolves.not.toThrow();
    });
  });

  describe('Security Utilities', () => {
    it('should hash sensitive data consistently', () => {
      const data = 'sensitive information';
      
      const hash1 = securityService.hashSensitiveData(data);
      const hash2 = securityService.hashSensitiveData(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
      expect(hash1).not.toBe(data);
    });

    it('should generate unique secure tokens', () => {
      const token1 = securityService.generateSecureToken();
      const token2 = securityService.generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(token2).toHaveLength(64);
    });

    it('should validate data integrity correctly', () => {
      const data = 'test data for integrity check';
      const hash = securityService.hashSensitiveData(data);
      
      expect(securityService.validateDataIntegrity(data, hash)).toBe(true);
      expect(securityService.validateDataIntegrity('modified data', hash)).toBe(false);
      expect(securityService.validateDataIntegrity(data, 'wrong hash')).toBe(false);
    });
  });
});

describe('Security Middleware', () => {
  let securityMiddleware: SecurityMiddleware;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    securityMiddleware = new SecurityMiddleware({
      enableAuditLogging: true,
      enableEncryption: false,
      sensitiveFields: ['password', 'token'],
      excludePaths: ['/health'],
    });

    mockReq = {
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      user: { id: 'user123', email: 'test@example.com', role: 'user' },
      body: {},
      query: {},
      params: {},
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      get: jest.fn(),
      on: jest.fn(),
      statusCode: 200,
    };

    mockNext = jest.fn();
  });

  describe('Audit Logger Middleware', () => {
    it('should add audit context to request', async () => {
      const middleware = securityMiddleware.auditLogger();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.securityContext).toBeDefined();
      expect(mockReq.securityContext.auditId).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip excluded paths', async () => {
      mockReq.path = '/health';
      const middleware = securityMiddleware.auditLogger();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.securityContext).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle anonymous users', async () => {
      mockReq.user = undefined;
      const middleware = securityMiddleware.auditLogger();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.securityContext).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate Limiter Middleware', () => {
    it('should allow requests within limit', () => {
      const middleware = securityMiddleware.rateLimiter(10, 60000);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    it('should block requests exceeding limit', () => {
      const middleware = securityMiddleware.rateLimiter(1, 60000);
      
      // First request should pass
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Second request should be blocked
      mockNext.mockClear();
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        })
      );
    });

    it('should use IP address for anonymous users', () => {
      mockReq.user = undefined;
      const middleware = securityMiddleware.rateLimiter(1, 60000);
      
      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Input Sanitizer Middleware', () => {
    it('should sanitize request body', () => {
      mockReq.body = {
        name: 'John<script>alert("xss")</script>',
        email: 'john@example.com',
        password: 'secret123',
      };

      const middleware = securityMiddleware.inputSanitizer();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('Johnscriptalert(xss)/script');
      expect(mockReq.body.email).toBe('john@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: 'test<>query',
        filter: 'normal_value',
      };

      const middleware = securityMiddleware.inputSanitizer();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.query.search).toBe('testquery');
      expect(mockReq.query.filter).toBe('normal_value');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      mockReq.body = {
        user: {
          profile: {
            bio: 'Hello<script>world</script>',
          },
        },
      };

      const middleware = securityMiddleware.inputSanitizer();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.user.profile.bio).toBe('Helloscriptworld/script');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      mockReq.body = {
        tags: ['tag1<script>', 'tag2', 'tag3>alert'],
      };

      const middleware = securityMiddleware.inputSanitizer();
      middleware(mockReq, mockRes, mockNext);

      // The sanitization should remove <, >, ", ', & characters
      expect(mockReq.body.tags).toEqual(['tag1script', 'tag2', 'tag3alert']);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Security Controller', () => {
  let securityController: SecurityController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    securityController = new SecurityController();
    
    mockReq = {
      user: { id: 'user123', email: 'test@example.com', role: 'admin' },
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getAuditLogs', () => {
    it('should return audit logs for admin user', async () => {
      await securityController.getAuditLogs(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            auditLogs: expect.any(Array),
            totalCount: expect.any(Number),
          }),
        })
      );
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;
      
      await securityController.getAuditLogs(mockReq, mockRes);

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

    it('should filter logs by date range', async () => {
      mockReq.query = {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-12-31T23:59:59.999Z',
      };

      await securityController.getAuditLogs(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            filters: expect.objectContaining({
              startDate: '2023-01-01T00:00:00.000Z',
              endDate: '2023-12-31T23:59:59.999Z',
            }),
          }),
        })
      );
    });
  });

  describe('getRetentionPolicies', () => {
    it('should return retention policies for admin', async () => {
      await securityController.getRetentionPolicies(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            policies: expect.any(Array),
          }),
        })
      );
    });

    it('should deny access to non-admin users', async () => {
      mockReq.user.role = 'user';
      
      await securityController.getRetentionPolicies(mockReq, mockRes);

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

  describe('updateRetentionPolicy', () => {
    it('should update retention policy for admin', async () => {
      mockReq.body = {
        resourceType: 'test_data',
        retentionPeriodDays: 90,
        autoDelete: true,
        archiveBeforeDelete: false,
      };

      await securityController.updateRetentionPolicy(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            policy: mockReq.body,
            message: 'Retention policy updated successfully',
          }),
        })
      );
    });

    it('should validate policy input', async () => {
      mockReq.body = {
        resourceType: '',
        retentionPeriodDays: 0,
      };

      await securityController.updateRetentionPolicy(mockReq, mockRes);

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

  describe('getSecurityStatus', () => {
    it('should return security status for admin', async () => {
      await securityController.getSecurityStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            encryptionEnabled: true,
            auditLoggingEnabled: true,
            retentionPoliciesCount: expect.any(Number),
            securityScore: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('generateSecurityToken', () => {
    it('should generate security token', async () => {
      mockReq.body = {
        purpose: 'API access',
        expiresIn: 3600,
      };

      await securityController.generateSecurityToken(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            purpose: 'API access',
            expiresAt: expect.any(String),
          }),
        })
      );
    });

    it('should require purpose', async () => {
      mockReq.body = {};

      await securityController.generateSecurityToken(mockReq, mockRes);

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
});