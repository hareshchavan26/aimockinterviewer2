// Interview Configuration Types and Interfaces

export interface InterviewConfig {
  id: string;
  userId: string;
  name: string;
  description?: string;
  templateId?: string;
  role: string;
  company?: string;
  industry: string;
  difficulty: DifficultyLevel;
  duration: number; // in minutes
  questionTypes: QuestionType[];
  focusAreas: FocusArea[];
  aiPersonality: AIPersonality;
  settings: InterviewSettings;
  isTemplate: boolean;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  configId?: string;
  templateId?: string;
  type: QuestionType;
  category: QuestionCategory;
  difficulty: DifficultyLevel;
  text: string;
  context?: string;
  expectedAnswerStructure?: AnswerStructure;
  evaluationCriteria: EvaluationCriteria[];
  followUpQuestions?: string[];
  timeLimit?: number; // in seconds
  tags: string[];
  metadata: QuestionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewSession {
  id: string;
  userId: string;
  configId: string;
  config: InterviewConfig;
  state: SessionState;
  currentQuestionIndex: number;
  questions: Question[];
  responses: SessionResponse[];
  startedAt: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  completedAt?: Date;
  duration: number; // actual duration in seconds
  metadata: SessionMetadata;
}

export interface SessionResponse {
  id: string;
  sessionId: string;
  questionId: string;
  question: Question;
  textResponse?: string;
  audioUrl?: string;
  videoUrl?: string;
  startedAt: Date;
  completedAt?: Date;
  duration: number; // response time in seconds
  isSkipped: boolean;
  confidence?: number;
  metadata: ResponseMetadata;
}

export interface InterviewTemplate {
  id: string;
  name: string;
  description: string;
  role: string;
  industry: string;
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  questionCount: number;
  questions: Question[];
  defaultSettings: InterviewSettings;
  tags: string[];
  isPublic: boolean;
  createdBy?: string;
  usageCount: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Enums and Types
export enum DifficultyLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  PRINCIPAL = 'principal',
  EXECUTIVE = 'executive',
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

export enum QuestionCategory {
  INTRODUCTION = 'introduction',
  EXPERIENCE = 'experience',
  SKILLS = 'skills',
  CHALLENGES = 'challenges',
  ACHIEVEMENTS = 'achievements',
  TEAMWORK = 'teamwork',
  CONFLICT_RESOLUTION = 'conflict_resolution',
  DECISION_MAKING = 'decision_making',
  INNOVATION = 'innovation',
  CLOSING = 'closing',
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

export enum SessionState {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  ERROR = 'error',
}

export enum AnswerStructure {
  STAR = 'star', // Situation, Task, Action, Result
  CAR = 'car',   // Challenge, Action, Result
  SOAR = 'soar', // Situation, Objective, Action, Result
  FREE_FORM = 'free_form',
  STRUCTURED = 'structured',
}

// Configuration Interfaces
export interface AIPersonality {
  name: string;
  style: InterviewStyle;
  tone: InterviewTone;
  formality: FormalityLevel;
  adaptiveness: number; // 0-1 scale
  followUpIntensity: number; // 0-1 scale
  encouragementLevel: number; // 0-1 scale
}

export interface InterviewSettings {
  allowPause: boolean;
  allowSkip: boolean;
  showTimer: boolean;
  enableRecording: boolean;
  enableVideoRecording: boolean;
  enableRealTimeFeedback: boolean;
  questionRandomization: boolean;
  adaptiveDifficulty: boolean;
  maxQuestions?: number;
  timePerQuestion?: number; // in seconds
  breaksBetweenQuestions: number; // in seconds
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  timeWarnings: boolean;
  warningThresholds: number[]; // percentages of time remaining
  soundEnabled: boolean;
  vibrationEnabled: boolean;
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

// Metadata Interfaces
export interface QuestionMetadata {
  source?: string;
  authorId?: string;
  version: number;
  lastReviewed?: Date;
  reviewedBy?: string;
  successRate?: number;
  averageScore?: number;
  usageCount: number;
}

export interface SessionMetadata {
  userAgent?: string;
  deviceType?: string;
  location?: string;
  timezone?: string;
  networkQuality?: string;
  interruptions?: number;
  technicalIssues?: string[];
  
  // Session control metadata
  sessionStarted?: string;
  pauseCount?: number;
  skipCount?: number;
  totalPausedTime?: number; // in seconds
  lastPausedAt?: string;
  lastResumedAt?: string;
  autoSkippedQuestions?: number[];
  skippedQuestions?: Array<{
    questionId: string;
    questionIndex: number;
    skippedAt: string;
    reason: string;
  }>;
  
  // Auto-completion metadata
  autoCompleted?: boolean;
  reason?: string;
  endReason?: string;
  abandonReason?: string;
  endedAt?: string;
  abandonedAt?: string;
}

export interface ResponseMetadata {
  wordCount?: number;
  sentenceCount?: number;
  pauseCount?: number;
  fillerWords?: number;
  speakingRate?: number; // words per minute
  confidenceLevel?: number;
  emotionalTone?: string;
  keywordsUsed?: string[];
}

// Enums for Configuration
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

export enum CriteriaType {
  CONTENT_QUALITY = 'content_quality',
  STRUCTURE = 'structure',
  COMMUNICATION = 'communication',
  TECHNICAL_ACCURACY = 'technical_accuracy',
  CREATIVITY = 'creativity',
  PROBLEM_SOLVING = 'problem_solving',
  LEADERSHIP = 'leadership',
}

// Request/Response Types
export interface CreateInterviewConfigRequest {
  name: string;
  description?: string;
  templateId?: string;
  role: string;
  company?: string;
  industry: string;
  difficulty: DifficultyLevel;
  duration: number;
  questionTypes: QuestionType[];
  focusAreas: FocusArea[];
  aiPersonality?: Partial<AIPersonality>;
  settings?: Partial<InterviewSettings>;
  tags?: string[];
}

export interface UpdateInterviewConfigRequest {
  name?: string;
  description?: string;
  role?: string;
  company?: string;
  industry?: string;
  difficulty?: DifficultyLevel;
  duration?: number;
  questionTypes?: QuestionType[];
  focusAreas?: FocusArea[];
  aiPersonality?: Partial<AIPersonality>;
  settings?: Partial<InterviewSettings>;
  tags?: string[];
}

export interface CreateSessionRequest {
  configId: string;
  settings?: Partial<InterviewSettings>;
}

export interface SessionControlRequest {
  action: SessionAction;
  metadata?: Record<string, any>;
}

export interface SubmitResponseRequest {
  questionId: string;
  textResponse?: string;
  audioUrl?: string;
  videoUrl?: string;
  metadata?: Partial<ResponseMetadata>;
}

export enum SessionAction {
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
  SKIP_QUESTION = 'skip_question',
  END = 'end',
  ABANDON = 'abandon',
}

// Service Interfaces
export interface InterviewConfigRepository {
  // Configuration operations
  createConfig(userId: string, configData: CreateInterviewConfigRequest): Promise<InterviewConfig>;
  findConfigById(configId: string): Promise<InterviewConfig | null>;
  findConfigsByUserId(userId: string): Promise<InterviewConfig[]>;
  updateConfig(configId: string, configData: UpdateInterviewConfigRequest): Promise<InterviewConfig>;
  deleteConfig(configId: string): Promise<void>;
  
  // Template operations
  findTemplateById(templateId: string): Promise<InterviewTemplate | null>;
  findTemplatesByRole(role: string): Promise<InterviewTemplate[]>;
  findTemplatesByIndustry(industry: string): Promise<InterviewTemplate[]>;
  searchTemplates(query: string, filters?: TemplateFilters): Promise<InterviewTemplate[]>;
  
  // Question operations
  findQuestionsByConfigId(configId: string): Promise<Question[]>;
  findQuestionsByTemplateId(templateId: string): Promise<Question[]>;
  createQuestion(questionData: Partial<Question>): Promise<Question>;
  updateQuestion(questionId: string, questionData: Partial<Question>): Promise<Question>;
  deleteQuestion(questionId: string): Promise<void>;
  
  // Session operations
  createSession(userId: string, sessionData: CreateSessionRequest): Promise<InterviewSession>;
  findSessionById(sessionId: string): Promise<InterviewSession | null>;
  findSessionsByUserId(userId: string): Promise<InterviewSession[]>;
  updateSession(sessionId: string, sessionData: Partial<InterviewSession>): Promise<InterviewSession>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Response operations
  createResponse(sessionId: string, responseData: SubmitResponseRequest): Promise<SessionResponse>;
  findResponsesBySessionId(sessionId: string): Promise<SessionResponse[]>;
  updateResponse(responseId: string, responseData: Partial<SessionResponse>): Promise<SessionResponse>;
}

export interface InterviewConfigService {
  // Configuration management
  createConfiguration(userId: string, configData: CreateInterviewConfigRequest): Promise<InterviewConfig>;
  getConfiguration(configId: string): Promise<InterviewConfig>;
  getUserConfigurations(userId: string): Promise<InterviewConfig[]>;
  updateConfiguration(configId: string, configData: UpdateInterviewConfigRequest): Promise<InterviewConfig>;
  deleteConfiguration(configId: string): Promise<void>;
  
  // Template management
  getTemplate(templateId: string): Promise<InterviewTemplate>;
  searchTemplates(query?: string, filters?: TemplateFilters): Promise<InterviewTemplate[]>;
  getTemplatesByRole(role: string): Promise<InterviewTemplate[]>;
  getTemplatesByIndustry(industry: string): Promise<InterviewTemplate[]>;
  
  // Configuration validation
  validateConfiguration(configData: CreateInterviewConfigRequest | UpdateInterviewConfigRequest): Promise<ValidationResult>;
  
  // Session management
  createSession(userId: string, sessionData: CreateSessionRequest): Promise<InterviewSession>;
  getSession(sessionId: string): Promise<InterviewSession>;
  getUserSessions(userId: string): Promise<InterviewSession[]>;
  controlSession(sessionId: string, action: SessionControlRequest): Promise<InterviewSession>;
  getSessionStatus(sessionId: string): Promise<{
    session: InterviewSession;
    timeStatus: {
      sessionTimeRemaining?: number;
      questionTimeRemaining?: number;
      sessionTimeExceeded: boolean;
      questionTimeExceeded: boolean;
    };
    progress: {
      currentQuestionIndex: number;
      totalQuestions: number;
      completedQuestions: number;
      skippedQuestions: number;
      progressPercentage: number;
    };
  }>;
  
  // Response management
  submitResponse(sessionId: string, responseData: SubmitResponseRequest): Promise<SessionResponse>;
  getSessionResponses(sessionId: string): Promise<SessionResponse[]>;
}

export interface TemplateFilters {
  role?: string;
  industry?: string;
  difficulty?: DifficultyLevel;
  duration?: { min?: number; max?: number };
  questionTypes?: QuestionType[];
  tags?: string[];
  isPublic?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Error Types
export class InterviewConfigError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'InterviewConfigError';
  }
}

export class ConfigNotFoundError extends InterviewConfigError {
  constructor(message: string, public configId?: string) {
    super(message, 'CONFIG_NOT_FOUND', 404);
    this.name = 'ConfigNotFoundError';
  }
}

export class TemplateNotFoundError extends InterviewConfigError {
  constructor(message: string, public templateId?: string) {
    super(message, 'TEMPLATE_NOT_FOUND', 404);
    this.name = 'TemplateNotFoundError';
  }
}

export class SessionNotFoundError extends InterviewConfigError {
  constructor(message: string, public sessionId?: string) {
    super(message, 'SESSION_NOT_FOUND', 404);
    this.name = 'SessionNotFoundError';
  }
}

export class InvalidSessionStateError extends InterviewConfigError {
  constructor(message: string, public currentState: SessionState, public requestedAction: SessionAction) {
    super(message, 'INVALID_SESSION_STATE', 400);
    this.name = 'InvalidSessionStateError';
  }
}

export class ConfigValidationError extends InterviewConfigError {
  constructor(message: string, public validationErrors: ValidationError[]) {
    super(message, 'CONFIG_VALIDATION_ERROR', 400);
    this.name = 'ConfigValidationError';
  }
}

export class UnauthorizedAccessError extends InterviewConfigError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED_ACCESS', 403);
    this.name = 'UnauthorizedAccessError';
  }
}