import { Request, Response } from 'express';
import { DefaultSecurityService, DataRetentionPolicy } from '../services/security-service';
import { AuthenticatedRequest } from '../middleware/security-middleware';
import { logger } from '../utils/logger';

export class SecurityController {
  private securityService: DefaultSecurityService;

  constructor() {
    this.securityService = new DefaultSecurityService();
  }

  // Get audit logs for the current user or admin view
  getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, userId } = req.query;
      const requestingUserId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      // Non-admin users can only see their own audit logs
      const targetUserId = isAdmin && userId ? userId as string : requestingUserId;

      if (!targetUserId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const auditLogs = await this.securityService.getAuditLogs(targetUserId, start, end);

      // Log this audit log access
      await this.securityService.logAuditEvent({
        userId: requestingUserId!,
        action: 'VIEW_AUDIT_LOGS',
        resource: 'audit_logs',
        metadata: {
          targetUserId,
          startDate: start?.toISOString(),
          endDate: end?.toISOString(),
          resultCount: auditLogs.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      });

      res.json({
        success: true,
        data: {
          auditLogs,
          totalCount: auditLogs.length,
          filters: {
            userId: targetUserId,
            startDate: start?.toISOString(),
            endDate: end?.toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get audit logs', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve audit logs',
        },
      });
    }
  };

  // Get data retention policies (admin only)
  getRetentionPolicies = async (req: AuthenticatedRequest, res: Response) => {
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

      const policies = await this.securityService.getRetentionPolicies();

      await this.securityService.logAuditEvent({
        userId: req.user!.id,
        action: 'VIEW_RETENTION_POLICIES',
        resource: 'retention_policies',
        metadata: {
          policyCount: policies.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      });

      res.json({
        success: true,
        data: {
          policies,
        },
      });
    } catch (error) {
      logger.error('Failed to get retention policies', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve retention policies',
        },
      });
    }
  };

  // Update data retention policy (admin only)
  updateRetentionPolicy = async (req: AuthenticatedRequest, res: Response) => {
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

      const policy: DataRetentionPolicy = req.body;

      // Validate policy
      if (!policy.resourceType || !policy.retentionPeriodDays) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Resource type and retention period are required',
          },
        });
      }

      if (policy.retentionPeriodDays < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Retention period must be at least 1 day',
          },
        });
      }

      await this.securityService.setRetentionPolicy(policy);

      await this.securityService.logAuditEvent({
        userId: req.user!.id,
        action: 'UPDATE_RETENTION_POLICY',
        resource: 'retention_policies',
        resourceId: policy.resourceType,
        metadata: {
          policy,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      });

      res.json({
        success: true,
        data: {
          policy,
          message: 'Retention policy updated successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to update retention policy', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update retention policy',
        },
      });
    }
  };

  // Manually trigger retention policy enforcement (admin only)
  enforceRetentionPolicies = async (req: AuthenticatedRequest, res: Response) => {
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

      await this.securityService.enforceRetentionPolicies();

      await this.securityService.logAuditEvent({
        userId: req.user!.id,
        action: 'ENFORCE_RETENTION_POLICIES',
        resource: 'retention_policies',
        metadata: {
          triggeredManually: true,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      });

      res.json({
        success: true,
        data: {
          message: 'Retention policies enforced successfully',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to enforce retention policies', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to enforce retention policies',
        },
      });
    }
  };

  // Get security metrics and status
  getSecurityStatus = async (req: AuthenticatedRequest, res: Response) => {
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

      const policies = await this.securityService.getRetentionPolicies();
      const recentAuditLogs = await this.securityService.getAuditLogs(
        undefined,
        new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );

      const securityStatus = {
        encryptionEnabled: true,
        auditLoggingEnabled: true,
        retentionPoliciesCount: policies.length,
        recentAuditEventsCount: recentAuditLogs.length,
        lastRetentionEnforcement: new Date().toISOString(), // This would come from actual tracking
        securityScore: this.calculateSecurityScore(policies, recentAuditLogs),
      };

      await this.securityService.logAuditEvent({
        userId: req.user!.id,
        action: 'VIEW_SECURITY_STATUS',
        resource: 'security_status',
        metadata: securityStatus,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      });

      res.json({
        success: true,
        data: securityStatus,
      });
    } catch (error) {
      logger.error('Failed to get security status', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve security status',
        },
      });
    }
  };

  // Generate security token for API access
  generateSecurityToken = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { purpose, expiresIn } = req.body;

      if (!purpose) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Token purpose is required',
          },
        });
      }

      const token = this.securityService.generateSecureToken();
      const expirationTime = expiresIn ? 
        new Date(Date.now() + expiresIn * 1000) : 
        new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

      await this.securityService.logAuditEvent({
        userId: req.user!.id,
        action: 'GENERATE_SECURITY_TOKEN',
        resource: 'security_tokens',
        metadata: {
          purpose,
          expiresAt: expirationTime.toISOString(),
          tokenLength: token.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      });

      res.json({
        success: true,
        data: {
          token,
          purpose,
          expiresAt: expirationTime.toISOString(),
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to generate security token', { error, userId: req.user?.id });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate security token',
        },
      });
    }
  };

  private calculateSecurityScore(policies: DataRetentionPolicy[], recentAuditLogs: any[]): number {
    let score = 0;

    // Base score for having policies
    score += policies.length > 0 ? 30 : 0;

    // Score for having comprehensive policies
    const resourceTypes = ['interview_sessions', 'performance_reports', 'audit_logs', 'user_recordings'];
    const coveredTypes = policies.map(p => p.resourceType);
    const coverage = resourceTypes.filter(type => coveredTypes.includes(type)).length;
    score += (coverage / resourceTypes.length) * 30;

    // Score for recent audit activity (indicates active monitoring)
    score += recentAuditLogs.length > 0 ? 20 : 0;

    // Score for reasonable retention periods (not too short, not too long)
    const reasonablePolicies = policies.filter(p => 
      p.retentionPeriodDays >= 30 && p.retentionPeriodDays <= 2555
    );
    score += (reasonablePolicies.length / policies.length) * 20;

    return Math.min(100, Math.max(0, score));
  }
}