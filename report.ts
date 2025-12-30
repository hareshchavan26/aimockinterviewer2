// Performance Report Types

export interface PerformanceReport {
  id: string;
  userId: string;
  interviewId: string;
  sessionId: string;
  generatedAt: Date;
  reportType: ReportType;
  overallScore: number; // 0-100
  categoryScores: CategoryScore[];
  detailedAnalysis: DetailedAnalysis;
  improvementRecommendations: ImprovementRecommendation[];
  metadata: ReportMetadata;
  version: string;
}

export interface CategoryScore {
  category: AnalysisCategory;
  score: number; // 0-100
  weight: number; // 0-1, for weighted average
  breakdown: ScoreBreakdown[];
  confidence: number; // 0-1
  trend?: ScoreTrend;
}

export interface ScoreBreakdown {
  metric: string;
  value: number;
  maxValue: number;
  description: string;
  impact: ImpactLevel;
}

export interface DetailedAnalysis {
  textAnalysis: TextAnalysisResult;
  speechAnalysis: SpeechAnalysisResult;
  emotionAnalysis: EmotionAnalysisResult;
  behaviorAnalysis: BehaviorAnalysisResult;
  technicalAnalysis?: TechnicalAnalysisResult;
  timeline: AnalysisTimeline[];
}

export interface TextAnalysisResult {
  contentQuality: number; // 0-100
  keywordRelevance: number; // 0-100
  starMethodUsage: number; // 0-100
  clarityScore: number; // 0-100
  completenessScore: number; // 0-100
  wordCount: number;
  averageResponseLength: number;
  vocabularyDiversity: number;
  grammarScore: number;
  keyPhrases: string[];
  sentimentScore: number; // -1 to 1
}

export interface SpeechAnalysisResult {
  paceScore: number; // 0-100
  pauseAnalysis: PauseAnalysis;
  fillerWordCount: number;
  fillerWordRate: number; // per minute
  clarityScore: number; // 0-100
  confidenceScore: number; // 0-100
  volumeConsistency: number; // 0-100
  speechRate: number; // words per minute
  totalSpeakingTime: number; // seconds
  silenceRatio: number; // 0-1
}

export interface PauseAnalysis {
  averagePauseLength: number; // seconds
  pauseCount: number;
  appropriatePauses: number;
  awkwardPauses: number;
  pauseDistribution: PauseDistribution[];
}

export interface PauseDistribution {
  duration: number; // seconds
  count: number;
  appropriateness: PauseAppropriateness;
}

export interface EmotionAnalysisResult {
  dominantEmotion: EmotionType;
  emotionDistribution: EmotionDistribution[];
  confidenceLevel: number; // 0-100
  emotionalStability: number; // 0-100
  stressIndicators: StressIndicator[];
  facialExpressionAnalysis?: FacialAnalysis;
}

export interface EmotionDistribution {
  emotion: EmotionType;
  percentage: number; // 0-100
  intensity: number; // 0-1
  duration: number; // seconds
}

export interface FacialAnalysis {
  eyeContactScore: number; // 0-100
  facialExpressionScore: number; // 0-100
  postureScore: number; // 0-100
  gestureAnalysis: GestureAnalysis;
}

export interface GestureAnalysis {
  gestureCount: number;
  appropriateGestures: number;
  distractingGestures: number;
  gestureVariety: number; // 0-100
}

export interface BehaviorAnalysisResult {
  engagementLevel: number; // 0-100
  responseTime: ResponseTimeAnalysis;
  hesitationPatterns: HesitationPattern[];
  nervousnessIndicators: NervousnessIndicator[];
  professionalismScore: number; // 0-100
}

export interface ResponseTimeAnalysis {
  averageResponseTime: number; // seconds
  responseTimeVariability: number;
  quickResponses: number;
  slowResponses: number;
  appropriateThinkingTime: number;
}

export interface HesitationPattern {
  type: HesitationType;
  frequency: number;
  averageDuration: number; // seconds
  context: string[];
}

export interface NervousnessIndicator {
  type: NervousnessType;
  severity: number; // 0-100
  frequency: number;
  timestamp: number[]; // seconds from start
}

export interface TechnicalAnalysisResult {
  technicalAccuracy: number; // 0-100
  conceptUnderstanding: number; // 0-100
  problemSolvingApproach: number; // 0-100
  codeQuality?: number; // 0-100
  systemDesignSkills?: number; // 0-100
  algorithmicThinking?: number; // 0-100
  bestPracticesUsage?: number; // 0-100
}

export interface AnalysisTimeline {
  timestamp: number; // seconds from start
  event: TimelineEvent;
  scores: Record<string, number>;
  notes?: string;
}

export interface TimelineEvent {
  type: EventType;
  description: string;
  severity: EventSeverity;
  category: AnalysisCategory;
}

export interface ImprovementRecommendation {
  id: string;
  category: AnalysisCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  specificActions: string[];
  practiceExercises: PracticeExercise[];
  expectedImprovement: number; // 0-100
  timeToImprove: string; // e.g., "2-3 weeks"
  resources: Resource[];
}

export interface PracticeExercise {
  title: string;
  description: string;
  duration: string;
  difficulty: ExerciseDifficulty;
  type: ExerciseType;
  instructions: string[];
}

export interface Resource {
  title: string;
  type: ResourceType;
  url?: string;
  description: string;
}

export interface ReportMetadata {
  interviewDuration: number; // seconds
  questionCount: number;
  interviewType: string;
  jobRole?: string;
  experienceLevel?: string;
  analysisVersion: string;
  processingTime: number; // milliseconds
  dataQuality: DataQuality;
  flags: ReportFlag[];
}

export interface DataQuality {
  audioQuality: number; // 0-100
  videoQuality?: number; // 0-100
  transcriptionAccuracy: number; // 0-100
  completeness: number; // 0-100
  reliability: number; // 0-100
}

export interface ReportFlag {
  type: FlagType;
  severity: FlagSeverity;
  message: string;
  affectedMetrics: string[];
}

export interface StressIndicator {
  type: StressType;
  intensity: number; // 0-100
  duration: number; // seconds
  timestamp: number; // seconds from start
}

// Enums
export enum ReportType {
  COMPREHENSIVE = 'comprehensive',
  QUICK_FEEDBACK = 'quick_feedback',
  TECHNICAL_FOCUS = 'technical_focus',
  BEHAVIORAL_FOCUS = 'behavioral_focus',
  COMMUNICATION_FOCUS = 'communication_focus',
}

export enum AnalysisCategory {
  COMMUNICATION = 'communication',
  TECHNICAL_SKILLS = 'technical_skills',
  PROBLEM_SOLVING = 'problem_solving',
  BEHAVIORAL = 'behavioral',
  PRESENTATION = 'presentation',
  CONFIDENCE = 'confidence',
  PROFESSIONALISM = 'professionalism',
}

export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ScoreTrend {
  IMPROVING = 'improving',
  DECLINING = 'declining',
  STABLE = 'stable',
  FLUCTUATING = 'fluctuating',
}

export enum EmotionType {
  CONFIDENT = 'confident',
  NERVOUS = 'nervous',
  EXCITED = 'excited',
  CALM = 'calm',
  FRUSTRATED = 'frustrated',
  FOCUSED = 'focused',
  UNCERTAIN = 'uncertain',
  ENTHUSIASTIC = 'enthusiastic',
}

export enum PauseAppropriateness {
  APPROPRIATE = 'appropriate',
  TOO_LONG = 'too_long',
  TOO_SHORT = 'too_short',
  AWKWARD = 'awkward',
}

export enum HesitationType {
  VERBAL_FILLER = 'verbal_filler',
  LONG_PAUSE = 'long_pause',
  REPETITION = 'repetition',
  FALSE_START = 'false_start',
  BACKTRACKING = 'backtracking',
}

export enum NervousnessType {
  SPEECH_PACE = 'speech_pace',
  VOICE_TREMOR = 'voice_tremor',
  EXCESSIVE_PAUSES = 'excessive_pauses',
  FILLER_WORDS = 'filler_words',
  VOLUME_FLUCTUATION = 'volume_fluctuation',
}

export enum EventType {
  QUESTION_START = 'question_start',
  RESPONSE_START = 'response_start',
  RESPONSE_END = 'response_end',
  LONG_PAUSE = 'long_pause',
  TECHNICAL_DISCUSSION = 'technical_discussion',
  BEHAVIORAL_RESPONSE = 'behavioral_response',
  CLARIFICATION_REQUEST = 'clarification_request',
}

export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CONCERN = 'concern',
  CRITICAL = 'critical',
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ExerciseDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum ExerciseType {
  SPEAKING_PRACTICE = 'speaking_practice',
  MOCK_INTERVIEW = 'mock_interview',
  TECHNICAL_DRILL = 'technical_drill',
  BEHAVIORAL_SCENARIO = 'behavioral_scenario',
  PRESENTATION = 'presentation',
  BREATHING_EXERCISE = 'breathing_exercise',
}

export enum ResourceType {
  ARTICLE = 'article',
  VIDEO = 'video',
  BOOK = 'book',
  COURSE = 'course',
  TOOL = 'tool',
  TEMPLATE = 'template',
}

export enum FlagType {
  LOW_AUDIO_QUALITY = 'low_audio_quality',
  INCOMPLETE_DATA = 'incomplete_data',
  ANALYSIS_UNCERTAINTY = 'analysis_uncertainty',
  TECHNICAL_ISSUE = 'technical_issue',
  UNUSUAL_PATTERN = 'unusual_pattern',
}

export enum FlagSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum StressType {
  VOCAL_STRESS = 'vocal_stress',
  BEHAVIORAL_STRESS = 'behavioral_stress',
  COGNITIVE_LOAD = 'cognitive_load',
  TIME_PRESSURE = 'time_pressure',
}

// Request/Response types
export interface GenerateReportRequest {
  userId: string;
  interviewId: string;
  sessionId: string;
  reportType: ReportType;
  includeRecommendations?: boolean;
  focusAreas?: AnalysisCategory[];
}

export interface ReportGenerationOptions {
  includeTimeline: boolean;
  includeFacialAnalysis: boolean;
  includeDetailedBreakdown: boolean;
  customWeights?: Record<AnalysisCategory, number>;
  benchmarkComparison?: boolean;
}

export interface ReportSummary {
  id: string;
  userId: string;
  interviewId: string;
  generatedAt: Date;
  reportType: ReportType;
  overallScore: number;
  topStrengths: string[];
  topImprovements: string[];
  status: ReportStatus;
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

// Service interfaces
export interface ReportGenerationService {
  generateReport(request: GenerateReportRequest, options?: ReportGenerationOptions): Promise<PerformanceReport>;
  getReport(reportId: string): Promise<PerformanceReport | null>;
  getUserReports(userId: string, limit?: number): Promise<ReportSummary[]>;
  deleteReport(reportId: string): Promise<void>;
  
  // Scoring algorithms
  calculateOverallScore(categoryScores: CategoryScore[]): number;
  calculateCategoryScore(category: AnalysisCategory, analysisData: any): CategoryScore;
  generateImprovementRecommendations(report: PerformanceReport): ImprovementRecommendation[];
  
  // Report processing
  processAnalysisData(interviewData: any): DetailedAnalysis;
  validateReportData(report: PerformanceReport): boolean;
  archiveOldReports(userId: string, retentionDays: number): Promise<number>;
}

export interface ReportRepository {
  createReport(report: Partial<PerformanceReport>): Promise<PerformanceReport>;
  findReportById(reportId: string): Promise<PerformanceReport | null>;
  findReportsByUserId(userId: string, limit?: number): Promise<PerformanceReport[]>;
  findReportsByInterviewId(interviewId: string): Promise<PerformanceReport[]>;
  updateReport(reportId: string, updates: Partial<PerformanceReport>): Promise<PerformanceReport>;
  deleteReport(reportId: string): Promise<void>;
  archiveReport(reportId: string): Promise<void>;
  
  // Analytics queries
  getUserAverageScores(userId: string, timeframe?: Date): Promise<Record<AnalysisCategory, number>>;
  getScoreTrends(userId: string, category: AnalysisCategory, timeframe?: Date): Promise<ScoreTrend>;
  getBenchmarkData(category: AnalysisCategory, jobRole?: string): Promise<number>;
}

// Error types
export class ReportGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ReportGenerationError';
  }
}

export class InsufficientDataError extends ReportGenerationError {
  constructor(message: string, public missingData: string[]) {
    super(message, 'INSUFFICIENT_DATA', 400);
    this.name = 'InsufficientDataError';
  }
}

export class AnalysisFailedError extends ReportGenerationError {
  constructor(message: string, public analysisType: string) {
    super(message, 'ANALYSIS_FAILED', 500);
    this.name = 'AnalysisFailedError';
  }
}