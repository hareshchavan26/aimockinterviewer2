import { Router } from 'express';
import { SecurityController } from '../controllers/security-controller';
import { auditLogger, rateLimiter, inputSanitizer } from '../middleware/security-middleware';

const router = Router();
const securityController = new SecurityController();

// Apply security middleware to all routes
router.use(auditLogger());
router.use(inputSanitizer());
router.use(rateLimiter(50, 15 * 60 * 1000)); // 50 requests per 15 minutes for security endpoints

/**
 * @route GET /api/reporting/security/audit-logs
 * @desc Get audit logs for the current user (or all users if admin)
 * @access Private
 * @query {string} [startDate] - Start date for filtering (ISO string)
 * @query {string} [endDate] - End date for filtering (ISO string)
 * @query {string} [userId] - User ID to filter by (admin only)
 */
router.get('/audit-logs', securityController.getAuditLogs);

/**
 * @route GET /api/reporting/security/retention-policies
 * @desc Get all data retention policies
 * @access Admin only
 */
router.get('/retention-policies', securityController.getRetentionPolicies);

/**
 * @route PUT /api/reporting/security/retention-policies
 * @desc Update a data retention policy
 * @access Admin only
 * @body {DataRetentionPolicy} policy - The retention policy to update
 */
router.put('/retention-policies', securityController.updateRetentionPolicy);

/**
 * @route POST /api/reporting/security/enforce-retention
 * @desc Manually trigger retention policy enforcement
 * @access Admin only
 */
router.post('/enforce-retention', securityController.enforceRetentionPolicies);

/**
 * @route GET /api/reporting/security/status
 * @desc Get security status and metrics
 * @access Admin only
 */
router.get('/status', securityController.getSecurityStatus);

/**
 * @route POST /api/reporting/security/generate-token
 * @desc Generate a secure token for API access
 * @access Private
 * @body {string} purpose - Purpose of the token
 * @body {number} [expiresIn] - Expiration time in seconds (default: 24 hours)
 */
router.post('/generate-token', securityController.generateSecurityToken);

export default router;