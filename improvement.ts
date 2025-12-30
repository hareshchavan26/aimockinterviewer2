import { Router } from 'express';
import { ImprovementController } from '../controllers/improvement-controller';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const improvementController = new ImprovementController();

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
const improvementPlanValidation = [
  body('categoryScores').isObject().withMessage('categoryScores must be an object'),
  body('analyses').isArray().withMessage('analyses must be an array'),
  body('session').isObject().withMessage('session must be an object'),
  body('session.id').isString().withMessage('session.id must be a string'),
  body('session.config').isObject().withMessage('session.config must be an object'),
  body('session.config.industry').isString().withMessage('session.config.industry must be a string'),
  body('session.config.role').isString().withMessage('session.config.role must be a string')
];

const answerSuggestionsValidation = [
  body('session').isObject().withMessage('session must be an object'),
  body('responses').isArray().withMessage('responses must be an array'),
  body('analyses').isArray().withMessage('analyses must be an array')
];

const practiceDrillsValidation = [
  body('priorityAreas').isArray().withMessage('priorityAreas must be an array'),
  body('categoryScores').isObject().withMessage('categoryScores must be an object'),
  body('session').isObject().withMessage('session must be an object')
];

const progressivePlanValidation = [
  body('targetArea').isString().withMessage('targetArea must be a string'),
  body('currentLevel').isFloat({ min: 0, max: 1 }).withMessage('currentLevel must be a number between 0 and 1'),
  body('timeframe').isInt({ min: 1 }).withMessage('timeframe must be a positive integer')
];

const dailyRoutineValidation = [
  body('priorityAreas').isArray().withMessage('priorityAreas must be an array'),
  body('availableTimePerDay').isInt({ min: 5 }).withMessage('availableTimePerDay must be at least 5 minutes')
];

const starExamplesValidation = [
  body('industry').isString().withMessage('industry must be a string'),
  body('role').isString().withMessage('role must be a string'),
  body('weaknessArea').isString().withMessage('weaknessArea must be a string')
];

const answerTemplatesValidation = [
  body('questionType').isString().withMessage('questionType must be a string'),
  body('industry').isString().withMessage('industry must be a string'),
  body('role').isString().withMessage('role must be a string')
];

const comprehensiveValidation = [
  body('categoryScores').isObject().withMessage('categoryScores must be an object'),
  body('analyses').isArray().withMessage('analyses must be an array'),
  body('session').isObject().withMessage('session must be an object'),
  body('responses').isArray().withMessage('responses must be an array')
];

/**
 * @route POST /api/reporting/improvement/plan
 * @desc Generate personalized improvement plan
 * @access Private
 */
router.post(
  '/plan',
  improvementPlanValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.generateImprovementPlan(req, res)
);

/**
 * @route POST /api/reporting/improvement/answer-suggestions
 * @desc Generate better answer suggestions
 * @access Private
 */
router.post(
  '/answer-suggestions',
  answerSuggestionsValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.generateAnswerSuggestions(req, res)
);

/**
 * @route POST /api/reporting/improvement/practice-drills
 * @desc Generate personalized practice drills
 * @access Private
 */
router.post(
  '/practice-drills',
  practiceDrillsValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.generatePracticeDrills(req, res)
);

/**
 * @route POST /api/reporting/improvement/progressive-plan
 * @desc Generate progressive drill plan
 * @access Private
 */
router.post(
  '/progressive-plan',
  progressivePlanValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.generateProgressivePlan(req, res)
);

/**
 * @route POST /api/reporting/improvement/daily-routine
 * @desc Generate daily practice routine
 * @access Private
 */
router.post(
  '/daily-routine',
  dailyRoutineValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.generateDailyRoutine(req, res)
);

/**
 * @route POST /api/reporting/improvement/star-examples
 * @desc Generate STAR method examples
 * @access Private
 */
router.post(
  '/star-examples',
  starExamplesValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.generateSTARExamples(req, res)
);

/**
 * @route POST /api/reporting/improvement/answer-templates
 * @desc Generate answer templates
 * @access Private
 */
router.post(
  '/answer-templates',
  answerTemplatesValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.generateAnswerTemplates(req, res)
);

/**
 * @route POST /api/reporting/improvement/comprehensive
 * @desc Get comprehensive improvement package
 * @access Private
 */
router.post(
  '/comprehensive',
  comprehensiveValidation,
  handleValidationErrors,
  (req: Request, res: Response) => improvementController.getComprehensiveImprovementPackage(req, res)
);

export default router;