import { Router } from 'express';
import { ProgressController } from '../controllers/progress-controller';
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const progressController = new ProgressController();

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

const timeframeValidation = [
  query('timeframe').optional().isInt({ min: 1, max: 24 }).withMessage('Timeframe must be between 1 and 24 months')
];

const trendAnalysisValidation = [
  body('sessions').isArray().withMessage('Sessions must be an array'),
  body('reports').isArray().withMessage('Reports must be an array')
];

const benchmarkValidation = [
  body('userScores').isObject().withMessage('User scores must be an object'),
  body('industry').isString().withMessage('Industry must be a string'),
  body('role').isString().withMessage('Role must be a string')
];

const milestonesValidation = [
  body('userId').isString().withMessage('User ID must be a string'),
  body('currentScores').isObject().withMessage('Current scores must be an object')
];

const visualizationValidation = [
  body('sessions').isArray().withMessage('Sessions must be an array'),
  body('reports').isArray().withMessage('Reports must be an array')
];

const comparisonValidation = [
  param('userId').isString().withMessage('User ID must be a string'),
  query('industry').optional().isString().withMessage('Industry must be a string'),
  query('role').optional().isString().withMessage('Role must be a string')
];

/**
 * @route GET /api/reporting/progress/:userId
 * @desc Get comprehensive progress analysis for a user
 * @access Private
 */
router.get(
  '/:userId',
  userIdValidation,
  timeframeValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.getUserProgress(req, res)
);

/**
 * @route POST /api/reporting/progress/trend-analysis
 * @desc Generate trend analysis for user sessions
 * @access Private
 */
router.post(
  '/trend-analysis',
  trendAnalysisValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.generateTrendAnalysis(req, res)
);

/**
 * @route POST /api/reporting/progress/benchmark-comparison
 * @desc Get benchmark comparison for user scores
 * @access Private
 */
router.post(
  '/benchmark-comparison',
  benchmarkValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.getBenchmarkComparison(req, res)
);

/**
 * @route POST /api/reporting/progress/milestones
 * @desc Track milestones for a user
 * @access Private
 */
router.post(
  '/milestones',
  milestonesValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.trackMilestones(req, res)
);

/**
 * @route POST /api/reporting/progress/visualization
 * @desc Generate progress visualization data
 * @access Private
 */
router.post(
  '/visualization',
  visualizationValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.generateProgressVisualization(req, res)
);

/**
 * @route GET /api/reporting/progress/:userId/summary
 * @desc Get progress summary for dashboard
 * @access Private
 */
router.get(
  '/:userId/summary',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.getProgressSummary(req, res)
);

/**
 * @route GET /api/reporting/progress/:userId/milestones
 * @desc Get detailed milestone information
 * @access Private
 */
router.get(
  '/:userId/milestones',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.getUserMilestones(req, res)
);

/**
 * @route GET /api/reporting/progress/:userId/comparison
 * @desc Compare user with industry/role benchmarks
 * @access Private
 */
router.get(
  '/:userId/comparison',
  comparisonValidation,
  handleValidationErrors,
  (req: Request, res: Response) => progressController.getDetailedComparison(req, res)
);

export default router;