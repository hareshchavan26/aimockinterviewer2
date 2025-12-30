/**
 * Emotion and Facial Analysis Routes
 * HTTP routes for emotion detection and facial expression analysis endpoints
 */

import { Router } from 'express';
import { EmotionFacialAnalysisController } from '../controllers/emotion-facial-analysis-controller';

const router = Router();
const emotionFacialController = new EmotionFacialAnalysisController();

// Main emotion and facial analysis endpoint
router.post('/analyze', 
  emotionFacialController.uploadMiddleware,
  emotionFacialController.analyzeEmotionFacial
);

// Specialized analysis endpoints
router.post('/analyze/voice-emotions',
  emotionFacialController.uploadMiddleware,
  emotionFacialController.analyzeVoiceEmotions
);

router.post('/analyze/facial-expressions',
  emotionFacialController.uploadMiddleware,
  emotionFacialController.analyzeFacialExpressions
);

router.post('/analyze/confidence',
  emotionFacialController.uploadMiddleware,
  emotionFacialController.analyzeConfidence
);

// Configuration and options
router.get('/options', emotionFacialController.getAnalysisOptions);

export { router as emotionFacialAnalysisRoutes };