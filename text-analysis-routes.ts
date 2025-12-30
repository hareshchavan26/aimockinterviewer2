/**
 * Text Analysis Routes
 * HTTP routes for text analysis endpoints
 */

import { Router } from 'express';
import { TextAnalysisController } from '../controllers/text-analysis-controller';

const router = Router();
const textAnalysisController = new TextAnalysisController();

// Main text analysis endpoint
router.post('/analyze', textAnalysisController.analyzeText);

// Specialized analysis endpoints
router.post('/analyze/star', textAnalysisController.analyzeSTARMethod);
router.post('/analyze/content-quality', textAnalysisController.analyzeContentQuality);

// Batch analysis
router.post('/analyze/batch', textAnalysisController.batchAnalyze);

// Configuration and options
router.get('/options', textAnalysisController.getAnalysisOptions);

export { router as textAnalysisRoutes };