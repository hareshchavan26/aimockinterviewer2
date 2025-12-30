import { Router } from 'express';
import { ReportExportController } from '../controllers/report-export-controller';
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const exportController = new ReportExportController();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array()
      }
    });
  }
  next();
};

// Validation rules
const reportExportValidation = [
  body('report').isObject().withMessage('Report must be an object'),
  body('session').isObject().withMessage('Session must be an object'),
  body('options').optional().isObject().withMessage('Options must be an object')
];

const csvExportValidation = [
  body('reports').isArray().withMessage('Reports must be an array'),
  body('sessions').isArray().withMessage('Sessions must be an array'),
  body('options').optional().isObject().withMessage('Options must be an object')
];

const formatValidation = [
  param('format').isIn(['pdf', 'json', 'csv']).withMessage('Format must be pdf, json, or csv')
];

const shareableLinkValidation = [
  body('reportId').isString().withMessage('Report ID must be a string'),
  body('userId').isString().withMessage('User ID must be a string'),
  body('expirationHours').optional().isInt({ min: 1, max: 8760 }).withMessage('Expiration hours must be between 1 and 8760'),
  body('maxAccess').optional().isInt({ min: 1 }).withMessage('Max access must be a positive integer')
];

const linkIdValidation = [
  param('linkId').isString().withMessage('Link ID must be a string')
];

const userIdValidation = [
  param('userId').isString().withMessage('User ID must be a string')
];

const paginationValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];

/**
 * @route POST /api/reporting/export/pdf
 * @desc Export single report to PDF
 * @access Private
 */
router.post(
  '/pdf',
  reportExportValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportToPDF(req, res)
);

/**
 * @route POST /api/reporting/export/json
 * @desc Export single report to JSON
 * @access Private
 */
router.post(
  '/json',
  reportExportValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportToJSON(req, res)
);

/**
 * @route POST /api/reporting/export/csv
 * @desc Export multiple reports to CSV
 * @access Private
 */
router.post(
  '/csv',
  csvExportValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportToCSV(req, res)
);

/**
 * @route POST /api/reporting/export/:format
 * @desc Export report in specified format
 * @access Private
 */
router.post(
  '/:format',
  formatValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportReport(req, res)
);

/**
 * @route POST /api/reporting/export/share
 * @desc Create shareable link for report
 * @access Private
 */
router.post(
  '/share',
  shareableLinkValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.createShareableLink(req, res)
);

/**
 * @route GET /api/reporting/export/share/:linkId
 * @desc Get shareable link details
 * @access Public
 */
router.get(
  '/share/:linkId',
  linkIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.getShareableLink(req, res)
);

/**
 * @route DELETE /api/reporting/export/share/:linkId
 * @desc Revoke shareable link
 * @access Private
 */
router.delete(
  '/share/:linkId',
  linkIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.revokeShareableLink(req, res)
);

/**
 * @route GET /api/reporting/export/shared/:linkId
 * @desc Access report via shareable link
 * @access Public
 */
router.get(
  '/shared/:linkId',
  linkIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.getSharedReport(req, res)
);

/**
 * @route GET /api/reporting/export/history/:userId
 * @desc Get export history for user
 * @access Private
 */
router.get(
  '/history/:userId',
  userIdValidation,
  paginationValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.getExportHistory(req, res)
);

/**
 * @route GET /api/reporting/export/stats/:userId
 * @desc Get export statistics for user
 * @access Private
 */
router.get(
  '/stats/:userId',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.getExportStats(req, res)
);

export default router;