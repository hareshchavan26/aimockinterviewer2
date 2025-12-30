import { Router } from 'express';
import { PrivacyController } from '../controllers/privacy-controller';
import { auditLogger, rateLimiter, inputSanitizer } from '../middleware/security-middleware';

const router = Router();
const privacyController = new PrivacyController();

// Apply security middleware to all routes
router.use(auditLogger());
router.use(inputSanitizer());
router.use(rateLimiter(50, 15 * 60 * 1000)); // 50 requests per 15 minutes for privacy endpoints

/**
 * @route GET /api/reporting/privacy/settings
 * @desc Get user's privacy settings
 * @access Private
 */
router.get('/settings', privacyController.getPrivacySettings);

/**
 * @route PUT /api/reporting/privacy/settings
 * @desc Update user's privacy settings
 * @access Private
 * @body {Partial<PrivacySettings>} settings - Privacy settings to update
 */
router.put('/settings', privacyController.updatePrivacySettings);

/**
 * @route POST /api/reporting/privacy/consent
 * @desc Record user consent
 * @access Private
 * @body {string} consentType - Type of consent (data_processing, analytics, marketing, data_retention)
 * @body {boolean} granted - Whether consent is granted
 * @body {string} version - Privacy policy version
 */
router.post('/consent', privacyController.recordConsent);

/**
 * @route POST /api/reporting/privacy/data-deletion
 * @desc Request data deletion (Right to Erasure)
 * @access Private
 * @body {string} requestType - Type of deletion (full_deletion, partial_deletion, anonymization)
 * @body {string[]} dataTypes - Types of data to delete
 * @body {string} [reason] - Optional reason for deletion
 */
router.post('/data-deletion', privacyController.requestDataDeletion);

/**
 * @route GET /api/reporting/privacy/data-deletion/:requestId
 * @desc Get data deletion request status
 * @access Private
 * @param {string} requestId - Data deletion request ID
 */
router.get('/data-deletion/:requestId', privacyController.getDataDeletionStatus);

/**
 * @route POST /api/reporting/privacy/data-export
 * @desc Request data export (Right to Portability)
 * @access Private
 * @body {string} format - Export format (json, csv, pdf)
 * @body {string[]} dataTypes - Types of data to export
 */
router.post('/data-export', privacyController.requestDataExport);

/**
 * @route GET /api/reporting/privacy/data-export/:requestId
 * @desc Get data export request status
 * @access Private
 * @param {string} requestId - Data export request ID
 */
router.get('/data-export/:requestId', privacyController.getDataExportStatus);

/**
 * @route GET /api/reporting/privacy/gdpr-report
 * @desc Generate GDPR compliance report
 * @access Private
 */
router.get('/gdpr-report', privacyController.generateGDPRReport);

/**
 * @route GET /api/reporting/privacy/validate-processing
 * @desc Validate data processing consent
 * @access Private
 */
router.get('/validate-processing', privacyController.validateDataProcessing);

/**
 * @route POST /api/reporting/privacy/admin/process-deletion/:requestId
 * @desc Process data deletion request (Admin only)
 * @access Admin
 * @param {string} requestId - Data deletion request ID
 */
router.post('/admin/process-deletion/:requestId', privacyController.processDataDeletion);

export default router;