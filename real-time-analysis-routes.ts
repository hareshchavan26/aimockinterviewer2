/**
 * Real-Time Analysis Routes
 * Defines API endpoints for real-time analysis pipeline
 * Requirements: 5.6
 */

import { Router } from 'express';
import { RealTimeAnalysisController } from '../controllers/real-time-analysis-controller';

const router = Router();
const realTimeAnalysisController = new RealTimeAnalysisController();

/**
 * @route POST /api/real-time-analysis/sessions
 * @desc Start a new real-time analysis session
 * @access Private
 */
router.post('/sessions', realTimeAnalysisController.startSession);

/**
 * @route POST /api/real-time-analysis/process
 * @desc Process real-time analysis request
 * @access Private
 */
router.post('/process', realTimeAnalysisController.processAnalysis);

/**
 * @route POST /api/real-time-analysis/text-stream
 * @desc Process text stream for real-time analysis
 * @access Private
 */
router.post('/text-stream', realTimeAnalysisController.processTextStream);

/**
 * @route GET /api/real-time-analysis/sessions/:sessionId/state
 * @desc Get current session state
 * @access Private
 */
router.get('/sessions/:sessionId/state', realTimeAnalysisController.getSessionState);

/**
 * @route GET /api/real-time-analysis/sessions/:sessionId/history
 * @desc Get session analysis history
 * @access Private
 */
router.get('/sessions/:sessionId/history', realTimeAnalysisController.getSessionHistory);

/**
 * @route DELETE /api/real-time-analysis/sessions/:sessionId
 * @desc End analysis session
 * @access Private
 */
router.delete('/sessions/:sessionId', realTimeAnalysisController.endSession);

export default router;