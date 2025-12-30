import { Router } from 'express';
import { ExportController } from '../controllers/export-controller';
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const exportController = new ExportController();

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
const userIdValidation = [
  param('userId').isString().withMessage('User ID must be a string')
];

const linkIdValidation = [
  param('linkId').isString().withMessage('Link ID must be a string')
];

const fileNameValidation = [
  param('fileName').isString().withMessage('File name must be a string')
];

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

const shareableLinkValidation = [
  body('reportId').isString().withMessage('Report ID must be a string'),
  body('userId').isString().withMessage('User ID must be a string'),
  body('expirationHours').optional().isInt({ min: 1, max: 8760 }).withMessage('Expiration hours must be between 1 and 8760'),
  body('maxAccess').optional().isInt({ min: 1 }).withMessage('Max access must be a positive integer'),
  body('password').optional().isString().withMessage('Password must be a string')
];

const revokeLinkValidation = [
  body('userId').isString().withMessage('User ID must be a string')
];

const passwordValidation = [
  query('password').optional().isString().withMessage('Password must be a string')
];

/**
 * @route POST /api/reporting/exports/pdf
 * @desc Export report to PDF
 * @access Private
 */
router.post(
  '/pdf',
  reportExportValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportToPDF(req, res)
);

/**
 * @route POST /api/reporting/exports/json
 * @desc Export report to JSON
 * @access Private
 */
router.post(
  '/json',
  reportExportValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.exportToJSON(req, res)
);

/**
 * @route POST /api/reporting/exports/csv
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
 * @route POST /api/reporting/exports/share
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
 * @route GET /api/reporting/exports/shared/:linkId
 * @desc Access shared report
 * @access Public
 */
router.get(
  '/shared/:linkId',
  linkIdValidation,
  passwordValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.getSharedReport(req, res)
);

/**
 * @route DELETE /api/reporting/exports/share/:linkId
 * @desc Revoke shareable link
 * @access Private
 */
router.delete(
  '/share/:linkId',
  linkIdValidation,
  revokeLinkValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.revokeShareableLink(req, res)
);

/**
 * @route GET /api/reporting/exports/history/:userId
 * @desc Get user's export history
 * @access Private
 */
router.get(
  '/history/:userId',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.getExportHistory(req, res)
);

/**
 * @route GET /api/reporting/exports/links/:userId
 * @desc Get user's active shareable links
 * @access Private
 */
router.get(
  '/links/:userId',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.getActiveShareableLinks(req, res)
);

/**
 * @route GET /api/reporting/exports/download/:fileName
 * @desc Download exported file
 * @access Private
 */
router.get(
  '/download/:fileName',
  fileNameValidation,
  handleValidationErrors,
  (req: Request, res: Response) => exportController.downloadFile(req, res)
);

/**
 * @route GET /api/reporting/exports/stats/:userId
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