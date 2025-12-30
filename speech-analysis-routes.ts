/**
 * Speech Analysis Routes
 * HTTP routes for speech analysis endpoints
 */

import { Router } from 'express';
import { SpeechAnalysisController } from '../controllers/speech-analysis-controller';

const router = Router();
const speechAnalysisController = new SpeechAnalysisController();

// Main speech analysis endpoint
router.post('/analyze', 
  speechAnalysisController.uploadMiddleware,
  speechAnalysisController.analyzeSpeech
);

// Specialized analysis endpoints
router.post('/analyze/pace',
  speechAnalysisController.uploadMiddleware,
  speechAnalysisController.analyzePace
);

router.post('/analyze/fillers',
  speechAnalysisController.uploadMiddleware,
  speechAnalysisController.analyzeFillers
);

router.post('/analyze/confidence',
  speechAnalysisController.uploadMiddleware,
  speechAnalysisController.analyzeConfidence
);

// Configuration and options
router.get('/options', speechAnalysisController.getAnalysisOptions);

export { router as speechAnalysisRoutes };