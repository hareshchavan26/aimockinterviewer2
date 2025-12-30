/**
 * Real-Time Analysis Pipeline Types
 * Supports real-time feedback generation, hesitation detection, and analysis aggregation
 * Requirements: 5.6
 */

export interface RealTimeAnalysisRequest {
  sessionId: string;
  analysisType: AnalysisType;
  inputData: RealTimeInputData;
  context: RealTimeAnalysisContext;
  options: RealTimeAnalysisOptions;
}

export interface RealTimeInputData {
  text?: string;
  audioChunk?: AudioChunk;
  videoFrame?: VideoFrame;
  timestamp: number;
  sequenceNumber: number;
}

export interface AudioChunk {
  buffer: Buffer;
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
}

export interface VideoFrame {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  frameRate: number;
}

export interface RealTimeAnalysisContext {
  questionType: string;
  interviewStage: string;
  expectedDuration?: number;
  currentTime: number;
  sessionStartTime: number;
}

export interface RealTimeAnalysisOptions {
  enableHesitationDetection: boolean;
  enableNervousnessDetection: boolean;
  enableConfidenceTracking: boolean;
  enablePaceAnalysis: boolean;
  enableEmotionTracking: boolean;
  feedbackThreshold: number;
  aggregationWindow: number; // milliseconds
}

export enum AnalysisType {
  TEXT_STREAM = 'text_stream',
  AUDIO_STREAM = 'audio_stream',
  VIDEO_STREAM = 'video_stream',
  MULTI_MODAL = 'multi_modal'
}

export interface RealTimeAnalysisResult {
  sessionId: string;
  timestamp: number;
  sequenceNumber: number;
  analysisType: AnalysisType;
  immediateInsights: ImmediateInsight[];
  hesitationDetection: HesitationAnalysis;
  nervousnessDetection: NervousnessAnalysis;
  aggregatedMetrics: AggregatedMetrics;
  feedbackTriggers: FeedbackTrigger[];
  confidence: number;
  processingLatency: number;
}

export interface ImmediateInsight {
  type: InsightType;
  severity: InsightSeverity;
  message: string;
  suggestion: string;
  confidence: number;
  timestamp: number;
  triggerData: any;
}

export enum InsightType {
  PACE_TOO_FAST = 'pace_too_fast',
  PACE_TOO_SLOW = 'pace_too_slow',
  EXCESSIVE_HESITATION = 'excessive_hesitation',
  LOW_CONFIDENCE = 'low_confidence',
  POOR_STRUCTURE = 'poor_structure',
  FILLER_WORDS = 'filler_words',
  EMOTIONAL_INSTABILITY = 'emotional_instability',
  GOOD_PACE = 'good_pace',
  CONFIDENT_DELIVERY = 'confident_delivery',
  CLEAR_STRUCTURE = 'clear_structure'
}

export enum InsightSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  POSITIVE = 'positive'
}

export interface HesitationAnalysis {
  hesitationCount: number;
  averageHesitationDuration: number;
  hesitationFrequency: number; // per minute
  hesitationPatterns: HesitationPattern[];
  overallHesitationScore: number;
  recommendations: string[];
}

export interface HesitationPattern {
  type: HesitationType;
  frequency: number;
  averageDuration: number;
  contexts: string[];
  severity: PatternSeverity;
}

export enum HesitationType {
  VERBAL_FILLER = 'verbal_filler',
  SILENT_PAUSE = 'silent_pause',
  REPETITION = 'repetition',
  FALSE_START = 'false_start',
  WORD_SEARCH = 'word_search'
}

export enum PatternSeverity {
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  SIGNIFICANT = 'significant',
  EXCESSIVE = 'excessive'
}

export interface NervousnessAnalysis {
  nervousnessLevel: number; // 0-1 scale
  nervousnessIndicators: NervousnessIndicator[];
  voiceStability: number;
  speechPattern: SpeechPatternAnalysis;
  emotionalState: EmotionalStateAnalysis;
  overallNervousnessScore: number;
  recommendations: string[];
}

export interface NervousnessIndicator {
  type: NervousnessType;
  intensity: number;
  confidence: number;
  timeSegments: TimeSegment[];
  description: string;
}

export enum NervousnessType {
  VOICE_TREMOR = 'voice_tremor',
  RAPID_SPEECH = 'rapid_speech',
  PITCH_VARIATION = 'pitch_variation',
  VOLUME_FLUCTUATION = 'volume_fluctuation',
  BREATHING_IRREGULARITY = 'breathing_irregularity',
  FACIAL_TENSION = 'facial_tension',
  MICRO_EXPRESSIONS = 'micro_expressions'
}

export interface TimeSegment {
  start: number;
  end: number;
  intensity: number;
}

export interface SpeechPatternAnalysis {
  averagePace: number;
  paceVariability: number;
  pauseFrequency: number;
  fillerWordRate: number;
  articulationClarity: number;
  volumeConsistency: number;
}

export interface EmotionalStateAnalysis {
  primaryEmotion: string;
  emotionIntensity: number;
  emotionStability: number;
  stressIndicators: string[];
  confidenceLevel: number;
}

export interface AggregatedMetrics {
  sessionDuration: number;
  totalWordsSpoken: number;
  averagePace: number;
  overallConfidence: number;
  hesitationRate: number;
  nervousnessLevel: number;
  emotionalStability: number;
  communicationEffectiveness: number;
  trendAnalysis: TrendAnalysis;
}

export interface TrendAnalysis {
  confidenceTrend: TrendDirection;
  paceTrend: TrendDirection;
  hesitationTrend: TrendDirection;
  nervousnessTrend: TrendDirection;
  improvementAreas: string[];
  strengths: string[];
}

export enum TrendDirection {
  IMPROVING = 'improving',
  DECLINING = 'declining',
  STABLE = 'stable',
  FLUCTUATING = 'fluctuating'
}

export interface FeedbackTrigger {
  type: FeedbackType;
  priority: FeedbackPriority;
  message: string;
  actionRequired: boolean;
  timestamp: number;
  data: any;
}

export enum FeedbackType {
  IMMEDIATE_CORRECTION = 'immediate_correction',
  ENCOURAGEMENT = 'encouragement',
  TECHNIQUE_SUGGESTION = 'technique_suggestion',
  PACING_ADJUSTMENT = 'pacing_adjustment',
  CONFIDENCE_BOOST = 'confidence_boost',
  STRUCTURE_GUIDANCE = 'structure_guidance'
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface RealTimeAnalysisConfig {
  enableRealTimeFeedback: boolean;
  feedbackDelay: number; // milliseconds
  analysisWindow: number; // milliseconds
  aggregationInterval: number; // milliseconds
  hesitationThresholds: HesitationThresholds;
  nervousnessThresholds: NervousnessThresholds;
  confidenceThresholds: ConfidenceThresholds;
  feedbackSettings: FeedbackSettings;
}

export interface HesitationThresholds {
  minHesitationDuration: number; // milliseconds
  maxAcceptableHesitations: number; // per minute
  criticalHesitationDuration: number; // milliseconds
  patternDetectionWindow: number; // milliseconds
}

export interface NervousnessThresholds {
  voiceStabilityThreshold: number; // 0-1
  paceVariabilityThreshold: number; // 0-1
  emotionalStabilityThreshold: number; // 0-1
  criticalNervousnessLevel: number; // 0-1
}

export interface ConfidenceThresholds {
  minConfidenceLevel: number; // 0-1
  confidenceDropThreshold: number; // 0-1
  confidenceRecoveryThreshold: number; // 0-1
  stabilityWindow: number; // milliseconds
}

export interface FeedbackSettings {
  enablePositiveFeedback: boolean;
  enableCorrectiveFeedback: boolean;
  feedbackFrequency: FeedbackFrequency;
  adaptiveFeedback: boolean;
  personalizedMessages: boolean;
}

export enum FeedbackFrequency {
  IMMEDIATE = 'immediate',
  PERIODIC = 'periodic',
  ON_DEMAND = 'on_demand',
  END_OF_RESPONSE = 'end_of_response'
}

export interface RealTimeAnalysisSession {
  sessionId: string;
  startTime: number;
  currentTime: number;
  analysisHistory: RealTimeAnalysisResult[];
  aggregatedState: SessionState;
  activeStreams: AnalysisType[];
  configuration: RealTimeAnalysisConfig;
}

export interface SessionState {
  overallConfidence: number;
  currentPace: number;
  hesitationLevel: number;
  nervousnessLevel: number;
  emotionalState: string;
  communicationEffectiveness: number;
  lastUpdateTime: number;
}

export class RealTimeAnalysisError extends Error {
  public code: RealTimeAnalysisErrorCode;
  public details?: any;

  constructor(params: { code: RealTimeAnalysisErrorCode; message: string; details?: any }) {
    super(params.message);
    this.name = 'RealTimeAnalysisError';
    this.code = params.code;
    this.details = params.details;
  }
}

export enum RealTimeAnalysisErrorCode {
  INVALID_INPUT_DATA = 'INVALID_INPUT_DATA',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  STREAM_INTERRUPTED = 'STREAM_INTERRUPTED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  FEEDBACK_GENERATION_FAILED = 'FEEDBACK_GENERATION_FAILED'
}