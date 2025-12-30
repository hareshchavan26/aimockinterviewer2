import { Router } from 'express';
import { AIInterviewerController } from '../controllers/ai-interviewer-controller';
import { DefaultAIInterviewerService } from '../services/ai-interviewer-service';

const router = Router();

// Initialize AI interviewer service and controller
const aiInterviewerService = new DefaultAIInterviewerService();
const aiInterviewerController = new AIInterviewerController(aiInterviewerService);

// Question generation routes
router.post('/questions/generate', (req, res) => 
  aiInterviewerController.generateQuestion(req, res)
);

router.post('/questions/follow-up', (req, res) => 
  aiInterviewerController.generateFollowUp(req, res)
);

// Response evaluation routes
router.post('/responses/evaluate', (req, res) => 
  aiInterviewerController.evaluateResponse(req, res)
);

router.post('/responses/evaluate-technical', (req, res) => 
  aiInterviewerController.evaluateTechnicalResponse(req, res)
);

// Difficulty adaptation routes
router.post('/difficulty/adapt', (req, res) => 
  aiInterviewerController.adaptDifficulty(req, res)
);

// Technical evaluation support routes
router.get('/technical/role-criteria', (req, res) => 
  aiInterviewerController.getRoleSpecificCriteria(req, res)
);

router.get('/technical/domain', (req, res) => 
  aiInterviewerController.getTechnicalDomain(req, res)
);

// Personality management routes
router.post('/personality/initialize', (req, res) => 
  aiInterviewerController.initializePersonality(req, res)
);

router.post('/personality/adapt', (req, res) => 
  aiInterviewerController.adaptPersonality(req, res)
);

router.post('/personality/update-state', (req, res) => 
  aiInterviewerController.updatePersonalityState(req, res)
);

router.post('/personality/response-style', (req, res) => 
  aiInterviewerController.getResponseStyle(req, res)
);

// Decision support routes
router.post('/decisions/should-follow-up', (req, res) => 
  aiInterviewerController.shouldAskFollowUp(req, res)
);

router.post('/preferences/questions', (req, res) => 
  aiInterviewerController.getQuestionPreferences(req, res)
);

// Health check
router.get('/health', (req, res) => 
  aiInterviewerController.healthCheck(req, res)
);

export default router;