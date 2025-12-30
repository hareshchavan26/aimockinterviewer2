// AI Interviewer Types and Interfaces

export interface AIInterviewerService {
  generateQuestion(context: QuestionGenerationContext): Promise<GeneratedQuestion>;
  generateFollowUpQuestion(context: FollowUpContext): Promise<GeneratedQuestion>;
  evaluateResponse(context: ResponseEvaluationContext): Promise<ResponseEvaluation>;
  evaluateTechnicalResponse(context: TechnicalEvaluationContext): Promise<TechnicalResponseEvaluation>;
  adaptPersonality(context: PersonalityAdaptationContext): Promise<AIPersonalityState>;
  adaptDifficulty(context: DifficultyAdaptationContext): Promise<DifficultyLevel>;
}

export interface QuestionGenerationContext {
  sessionId: string;
  userId: string;
  interviewConfig: InterviewConfigSummary;
  currentQuestionIndex: number;
  previousResponses: ResponseSummary[];
  personalityState: AIPersonalityState;
  questionType?: QuestionType;
  difficulty?: DifficultyLevel;
  focusArea?: FocusArea;
}

export interface FollowUpContext {
  sessionId: string;
  userId: string;
  originalQuestion: GeneratedQuestion;
  userResponse: ResponseSummary;
  personalityState: AIPersonalityState;
  interviewConfig: InterviewConfigSummary;
}

export interface ResponseEvaluationContext {
  sessionId: string;
  question: GeneratedQuestion;
  userResponse: ResponseSummary;
  evaluationCriteria: EvaluationCriteria[];
  personalityState: AIPersonalityState;
}

export interface PersonalityAdaptationContext {
  sessionId: string;
  userId: string;
  interviewConfig: InterviewConfigSummary;
  sessionHistory: ResponseSummary[];
  currentPersonality: AIPersonalityState;
}

export interface TechnicalEvaluationContext {
  sessionId: string;
  question: GeneratedQuestion;
  userResponse: ResponseSummary;
  roleSpecificCriteria: RoleSpecificCriteria;
  technicalDomain: TechnicalDomain;
  expectedSolution?: ExpectedSolution;
  personalityState: AIPersonalityState;
}

export interface DifficultyAdaptationContext {
  sessionId: string;
  userId: string;
  interviewConfig: InterviewConfigSummary;
  sessionHistory: ResponseSummary[];
  currentDifficulty: DifficultyLevel;
  performanceMetrics: PerformanceMetrics;
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  type: QuestionType;
  category: string;
  difficulty: DifficultyLevel;
  expectedAnswerStructure?: AnswerStructure;
  evaluationCriteria: EvaluationCriteria[];
  timeLimit?: number;
  context?: string;
  followUpQuestions?: string[];
  metadata: QuestionMetadata;
}

export interface ResponseSummary {
  questionId: string;
  questionText: string;
  responseText?: string;
  duration: number;
  confidence?: number;
  isSkipped: boolean;
  timestamp: Date;
  evaluationScore?: number;
  keyPoints?: string[];
}

export interface ResponseEvaluation {
  overallScore: number; // 0-100
  criteriaScores: CriteriaScore[];
  strengths: string[];
  improvements: string[];
  followUpSuggestions: string[];
  confidence: number; // 0-1
  metadata: EvaluationMetadata;
}

export interface TechnicalResponseEvaluation extends ResponseEvaluation {
  technicalAccuracy: number; // 0-100
  completeness: number; // 0-100
  codeQuality?: CodeQualityMetrics;
  algorithmicComplexity?: ComplexityAnalysis;
  roleSpecificScores: RoleSpecificScore[];
  difficultyAssessment: DifficultyAssessment;
  adaptationRecommendation: DifficultyAdaptationRecommendation;
}

export interface CriteriaScore {
  criteriaId: string;
  criteriaName: string;
  score: number; // 0-100
  feedback: string;
  weight: number;
}

export interface EvaluationMetadata {
  processingTime: number;
  modelVersion: string;
  confidence: number;
  flags: string[];
}

export interface AIPersonalityState {
  name: string;
  style: InterviewStyle;
  tone: InterviewTone;
  formality: FormalityLevel;
  adaptiveness: number; // 0-1
  followUpIntensity: number; // 0-1
  encouragementLevel: number; // 0-1
  
  // Dynamic state that adapts during interview
  currentMood: InterviewerMood;
  adaptationLevel: number; // How much the personality has adapted
  userEngagementLevel: number; // Perceived user engagement
  sessionProgress: number; // 0-1, how far through the interview
  
  // Conversation context
  conversationHistory: ConversationTurn[];
  lastQuestionType: QuestionType;
  consecutiveFollowUps: number;
}

export interface ConversationTurn {
  type: 'question' | 'response' | 'follow_up';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface InterviewConfigSummary {
  id: string;
  role: string;
  industry: string;
  difficulty: DifficultyLevel;
  duration: number;
  questionTypes: QuestionType[];
  focusAreas: FocusArea[];
  aiPersonality: AIPersonalityConfig;
}

export interface AIPersonalityConfig {
  name: string;
  style: InterviewStyle;
  tone: InterviewTone;
  formality: FormalityLevel;
  adaptiveness: number;
  followUpIntensity: number;
  encouragementLevel: number;
}

// Enums
export enum InterviewerMood {
  WELCOMING = 'welcoming',
  PROFESSIONAL = 'professional',
  ENCOURAGING = 'encouraging',
  CHALLENGING = 'challenging',
  SUPPORTIVE = 'supportive',
  ANALYTICAL = 'analytical',
}

export enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  SITUATIONAL = 'situational',
  CASE_STUDY = 'case_study',
  CODING = 'coding',
  SYSTEM_DESIGN = 'system_design',
  CULTURE_FIT = 'culture_fit',
  LEADERSHIP = 'leadership',
  PROBLEM_SOLVING = 'problem_solving',
}

export enum DifficultyLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  PRINCIPAL = 'principal',
  EXECUTIVE = 'executive',
}

export enum FocusArea {
  COMMUNICATION = 'communication',
  LEADERSHIP = 'leadership',
  PROBLEM_SOLVING = 'problem_solving',
  TECHNICAL_SKILLS = 'technical_skills',
  TEAMWORK = 'teamwork',
  ADAPTABILITY = 'adaptability',
  CREATIVITY = 'creativity',
  ANALYTICAL_THINKING = 'analytical_thinking',
  CUSTOMER_FOCUS = 'customer_focus',
  RESULTS_ORIENTATION = 'results_orientation',
}

export enum InterviewStyle {
  CONVERSATIONAL = 'conversational',
  FORMAL = 'formal',
  CASUAL = 'casual',
  STRUCTURED = 'structured',
  FLEXIBLE = 'flexible',
}

export enum InterviewTone {
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  ENCOURAGING = 'encouraging',
  CHALLENGING = 'challenging',
  NEUTRAL = 'neutral',
}

export enum FormalityLevel {
  VERY_FORMAL = 'very_formal',
  FORMAL = 'formal',
  SEMI_FORMAL = 'semi_formal',
  CASUAL = 'casual',
  VERY_CASUAL = 'very_casual',
}

export enum AnswerStructure {
  STAR = 'star', // Situation, Task, Action, Result
  CAR = 'car',   // Challenge, Action, Result
  SOAR = 'soar', // Situation, Objective, Action, Result
  FREE_FORM = 'free_form',
  STRUCTURED = 'structured',
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1 scale
  type: CriteriaType;
  expectedKeywords?: string[];
  scoringRubric: ScoringRubric[];
}

export interface ScoringRubric {
  score: number; // 1-5 scale
  description: string;
  indicators: string[];
}

export enum CriteriaType {
  CONTENT_QUALITY = 'content_quality',
  STRUCTURE = 'structure',
  COMMUNICATION = 'communication',
  TECHNICAL_ACCURACY = 'technical_accuracy',
  CREATIVITY = 'creativity',
  PROBLEM_SOLVING = 'problem_solving',
  LEADERSHIP = 'leadership',
}

// Technical evaluation enums
export enum TechnicalDomain {
  SOFTWARE_ENGINEERING = 'software_engineering',
  DATA_SCIENCE = 'data_science',
  MACHINE_LEARNING = 'machine_learning',
  SYSTEM_DESIGN = 'system_design',
  FRONTEND_DEVELOPMENT = 'frontend_development',
  BACKEND_DEVELOPMENT = 'backend_development',
  DEVOPS = 'devops',
  CYBERSECURITY = 'cybersecurity',
  MOBILE_DEVELOPMENT = 'mobile_development',
  CLOUD_ARCHITECTURE = 'cloud_architecture',
}

export enum TechnicalCategory {
  PROGRAMMING_LANGUAGE = 'programming_language',
  FRAMEWORK = 'framework',
  DATABASE = 'database',
  ALGORITHM = 'algorithm',
  DATA_STRUCTURE = 'data_structure',
  SYSTEM_DESIGN = 'system_design',
  ARCHITECTURE = 'architecture',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  SECURITY = 'security',
}

export enum SkillImportance {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NICE_TO_HAVE = 'nice_to_have',
}

export enum AdaptationStrategy {
  INCREASE_DIFFICULTY = 'increase_difficulty',
  DECREASE_DIFFICULTY = 'decrease_difficulty',
  MAINTAIN_LEVEL = 'maintain_level',
  FOCUS_ON_WEAK_AREAS = 'focus_on_weak_areas',
  BROADEN_SCOPE = 'broaden_scope',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  DECLINING = 'declining',
  STABLE = 'stable',
  INCONSISTENT = 'inconsistent',
}

export interface QuestionMetadata {
  source?: string;
  authorId?: string;
  version: number;
  lastReviewed?: Date;
  reviewedBy?: string;
  successRate?: number;
  averageScore?: number;
  usageCount: number;
  generatedAt: Date;
  modelVersion: string;
}

// Technical evaluation interfaces
export interface RoleSpecificCriteria {
  role: string;
  industry: string;
  requiredSkills: TechnicalSkill[];
  evaluationWeights: Record<CriteriaType, number>;
  complexityExpectations: ComplexityExpectation[];
}

export interface TechnicalSkill {
  name: string;
  category: TechnicalCategory;
  importance: SkillImportance;
  keywords: string[];
  assessmentCriteria: string[];
}

export interface ExpectedSolution {
  description: string;
  keyComponents: string[];
  alternativeApproaches: string[];
  commonMistakes: string[];
  timeComplexity?: string;
  spaceComplexity?: string;
  codeExample?: string;
}

export interface CodeQualityMetrics {
  readability: number; // 0-100
  maintainability: number; // 0-100
  efficiency: number; // 0-100
  bestPractices: number; // 0-100
  errorHandling: number; // 0-100
}

export interface ComplexityAnalysis {
  timeComplexity: string;
  spaceComplexity: string;
  isOptimal: boolean;
  improvementSuggestions: string[];
}

export interface RoleSpecificScore {
  skillName: string;
  score: number; // 0-100
  importance: SkillImportance;
  feedback: string;
  examples: string[];
}

export interface DifficultyAssessment {
  perceivedDifficulty: DifficultyLevel;
  actualPerformance: number; // 0-100
  isAppropriate: boolean;
  reasoning: string;
}

export interface DifficultyAdaptationRecommendation {
  recommendedLevel: DifficultyLevel;
  confidence: number; // 0-1
  reasoning: string;
  adaptationStrategy: AdaptationStrategy;
}

export interface PerformanceMetrics {
  averageScore: number;
  scoreVariance: number;
  responseTime: number;
  skipRate: number;
  confidenceLevel: number;
  improvementTrend: TrendDirection;
}

export interface ComplexityExpectation {
  level: DifficultyLevel;
  expectedTimeComplexity: string[];
  expectedSpaceComplexity: string[];
  requiredConcepts: string[];
}

// Error types
export class AIInterviewerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AIInterviewerError';
  }
}

export class QuestionGenerationError extends AIInterviewerError {
  constructor(message: string, public context?: QuestionGenerationContext) {
    super(message, 'QUESTION_GENERATION_ERROR', 500);
    this.name = 'QuestionGenerationError';
  }
}

export class ResponseEvaluationError extends AIInterviewerError {
  constructor(message: string, public context?: ResponseEvaluationContext) {
    super(message, 'RESPONSE_EVALUATION_ERROR', 500);
    this.name = 'ResponseEvaluationError';
  }
}

export class PersonalityAdaptationError extends AIInterviewerError {
  constructor(message: string, public context?: PersonalityAdaptationContext) {
    super(message, 'PERSONALITY_ADAPTATION_ERROR', 500);
    this.name = 'PersonalityAdaptationError';
  }
}

export class TechnicalEvaluationError extends AIInterviewerError {
  constructor(message: string, public context?: TechnicalEvaluationContext) {
    super(message, 'TECHNICAL_EVALUATION_ERROR', 500);
    this.name = 'TechnicalEvaluationError';
  }
}

export class DifficultyAdaptationError extends AIInterviewerError {
  constructor(message: string, public context?: DifficultyAdaptationContext) {
    super(message, 'DIFFICULTY_ADAPTATION_ERROR', 500);
    this.name = 'DifficultyAdaptationError';
  }
}