import { Router } from 'express';
import { UserEngagementController } from '../controllers/user-engagement-controller';
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const engagementController = new UserEngagementController();

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

const notificationIdValidation = [
  param('notificationId').isString().withMessage('Notification ID must be a string')
];

const recommendationIdValidation = [
  param('recommendationId').isString().withMessage('Recommendation ID must be a string')
];

const limitValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const scheduleReminderValidation = [
  body('scheduledFor').isISO8601().withMessage('Scheduled time must be a valid ISO 8601 date')
];

const checkAchievementsValidation = [
  body('sessionData').isObject().withMessage('Session data must be an object'),
  body('reportData').isObject().withMessage('Report data must be an object')
];

const generateRecommendationsValidation = [
  body('recentSessions').isArray().withMessage('Recent sessions must be an array'),
  body('recentReports').isArray().withMessage('Recent reports must be an array')
];

const updateEngagementValidation = [
  body('activityType').isString().withMessage('Activity type must be a string')
];

/**
 * @route GET /api/reporting/engagement/:userId/notifications
 * @desc Get user notifications
 * @access Private
 */
router.get(
  '/:userId/notifications',
  userIdValidation,
  limitValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.getUserNotifications(req, res)
);

/**
 * @route PUT /api/reporting/engagement/notifications/:notificationId/read
 * @desc Mark notification as read
 * @access Private
 */
router.put(
  '/notifications/:notificationId/read',
  notificationIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.markNotificationAsRead(req, res)
);

/**
 * @route POST /api/reporting/engagement/:userId/reminders
 * @desc Schedule practice reminder
 * @access Private
 */
router.post(
  '/:userId/reminders',
  userIdValidation,
  scheduleReminderValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.scheduleReminder(req, res)
);

/**
 * @route GET /api/reporting/engagement/:userId/achievements
 * @desc Get user achievements
 * @access Private
 */
router.get(
  '/:userId/achievements',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.getUserAchievements(req, res)
);

/**
 * @route POST /api/reporting/engagement/:userId/check-achievements
 * @desc Check for new achievements after session completion
 * @access Private
 */
router.post(
  '/:userId/check-achievements',
  userIdValidation,
  checkAchievementsValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.checkAchievements(req, res)
);

/**
 * @route GET /api/reporting/engagement/:userId/recommendations
 * @desc Get practice recommendations
 * @access Private
 */
router.get(
  '/:userId/recommendations',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.getPracticeRecommendations(req, res)
);

/**
 * @route POST /api/reporting/engagement/:userId/recommendations/generate
 * @desc Generate new practice recommendations
 * @access Private
 */
router.post(
  '/:userId/recommendations/generate',
  userIdValidation,
  generateRecommendationsValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.generateRecommendations(req, res)
);

/**
 * @route PUT /api/reporting/engagement/recommendations/:recommendationId/complete
 * @desc Mark recommendation as completed
 * @access Private
 */
router.put(
  '/recommendations/:recommendationId/complete',
  recommendationIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.completeRecommendation(req, res)
);

/**
 * @route GET /api/reporting/engagement/:userId/metrics
 * @desc Get user engagement metrics
 * @access Private
 */
router.get(
  '/:userId/metrics',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.getEngagementMetrics(req, res)
);

/**
 * @route POST /api/reporting/engagement/:userId/activity
 * @desc Update user engagement activity
 * @access Private
 */
router.post(
  '/:userId/activity',
  userIdValidation,
  updateEngagementValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.updateEngagement(req, res)
);

/**
 * @route GET /api/reporting/engagement/:userId/dashboard
 * @desc Get engagement dashboard data
 * @access Private
 */
router.get(
  '/:userId/dashboard',
  userIdValidation,
  handleValidationErrors,
  (req: Request, res: Response) => engagementController.getEngagementDashboard(req, res)
);

export default router;