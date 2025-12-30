/**
 * Speech Analysis Types
 * Defines interfaces for speech and audio analysis
 */

export interface SpeechAnalysisRequest {
  audioData: AudioData;
  context: SpeechAnalysisContext;
  options: SpeechAnalysisOptions;
}

export interface AudioData {
  buffer: Buffer;
  format: AudioFormat;
  duration: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface AudioFormat {
  encoding: AudioEncoding;
  mimeType: string;
  extension: string;
}

export enum AudioEncoding {
  WAV = 'wav',
  MP3 = 'mp3',
  FLAC = 'flac',
  OGG = 'ogg',
  WEBM = 'webm',
  M4A = 'm4a'
}

export interface SpeechAnalysisContext {
  questionType: string;
  expectedDuration?: number;
  language: string;
  speakerProfile?: SpeakerProfile;
  interviewStage?: InterviewStage;
}

export interface SpeakerProfile {
  speakerId: string;
  nativeLanguage?: string;
  previousAnalyses?: SpeechMetrics[];
  baselineMetrics?: SpeechMetrics;
}

export enum InterviewStage {
  INTRODUCTION = 'introduction',
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  CLOSING = 'closing'
}

export interface SpeechAnalysisOptions {
  enableTranscription: boolean;
  enablePaceAnalysis: boolean;
  enablePauseAnalysis: boolean;
  enableFillerDetection: boolean;
  enableClarityAnalysis: boolean;
  enableConfidenceAnalysis: boolean;
  enableEmotionDetection: boolean;
  enableVolumeAnalysis: boolean;
  confidenceThreshold: number;
  whisperModel: WhisperModel;
}

export enum WhisperModel {
  TINY = 'tiny',
  BASE = 'base',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export interface SpeechAnalysisResult {
  overallScore: number;
  transcription: TranscriptionResult;
  paceAnalysis: PaceAnalysis;
  pauseAnalysis: PauseAnalysis;
  fillerAnalysis: FillerAnalysis;
  clarityAnalysis: ClarityAnalysis;
  confidenceAnalysis: ConfidenceAnalysis;
  emotionAnalysis: EmotionAnalysis;
  volumeAnalysis: VolumeAnalysis;
  recommendations: string[];
  confidence: number;
  processingTime: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  confidence: number;
  wordCount: number;
  duration: number;
}

export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
  words: WordSegment[];
}

export interface WordSegment {
  word: string;
  start: number;
  end: number;
  confidence: number;
  probability: number;
}

export interface PaceAnalysis {
  score: number;
  metrics: PaceMetrics;
  patterns: PacePattern[];
  recommendations: string[];
}

export interface PaceMetrics {
  averageWordsPerMinute: number;
  averageSyllablesPerMinute: number;
  variability: number;
  optimalRange: PaceRange;
  deviationFromOptimal: number;
  rushingSegments: TimeSegment[];
  slowSegments: TimeSegment[];
}

export interface PaceRange {
  min: number;
  max: number;
  optimal: number;
}

export interface TimeSegment {
  start: number;
  end: number;
  value: number;
  severity: SegmentSeverity;
}

export enum SegmentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface PacePattern {
  type: PacePatternType;
  segments: TimeSegment[];
  impact: number;
  description: string;
}

export enum PacePatternType {
  CONSISTENT = 'consistent',
  ACCELERATING = 'accelerating',
  DECELERATING = 'decelerating',
  ERRATIC = 'erratic',
  NERVOUS_RUSH = 'nervous_rush',
  THOUGHTFUL_PAUSE = 'thoughtful_pause'
}

export interface PauseAnalysis {
  score: number;
  metrics: PauseMetrics;
  patterns: PausePattern[];
  recommendations: string[];
}

export interface PauseMetrics {
  totalPauseTime: number;
  pauseFrequency: number;
  averagePauseLength: number;
  longestPause: number;
  shortestPause: number;
  filledPauses: number;
  unfilledPauses: number;
  strategicPauses: number;
  hesitationPauses: number;
}

export interface PausePattern {
  type: PausePatternType;
  occurrences: PauseOccurrence[];
  frequency: number;
  impact: PauseImpact;
}

export enum PausePatternType {
  STRATEGIC = 'strategic',
  HESITATION = 'hesitation',
  BREATHING = 'breathing',
  THINKING = 'thinking',
  NERVOUS = 'nervous',
  TECHNICAL_DIFFICULTY = 'technical_difficulty'
}

export interface PauseOccurrence {
  start: number;
  end: number;
  duration: number;
  type: PausePatternType;
  context: string;
  severity: SegmentSeverity;
}

export enum PauseImpact {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative'
}

export interface FillerAnalysis {
  score: number;
  metrics: FillerMetrics;
  detectedFillers: FillerOccurrence[];
  recommendations: string[];
}

export interface FillerMetrics {
  totalFillers: number;
  fillersPerMinute: number;
  fillerPercentage: number;
  mostCommonFillers: FillerFrequency[];
  fillerDensityBySegment: FillerDensity[];
}

export interface FillerFrequency {
  filler: string;
  count: number;
  percentage: number;
  impact: FillerImpact;
}

export enum FillerImpact {
  MINIMAL = 'minimal',
  NOTICEABLE = 'noticeable',
  DISTRACTING = 'distracting',
  SEVERE = 'severe'
}

export interface FillerDensity {
  segment: TimeSegment;
  density: number;
  fillers: string[];
}

export interface FillerOccurrence {
  filler: string;
  start: number;
  end: number;
  confidence: number;
  context: string;
  type: FillerType;
}

export enum FillerType {
  VERBAL = 'verbal',        // um, uh, er
  LEXICAL = 'lexical',      // like, you know, basically
  REPETITION = 'repetition', // word repetitions
  FALSE_START = 'false_start' // incomplete words/phrases
}

export interface ClarityAnalysis {
  score: number;
  metrics: ClarityMetrics;
  issues: ClarityIssue[];
  recommendations: string[];
}

export interface ClarityMetrics {
  articulationScore: number;
  pronunciationScore: number;
  enunciationScore: number;
  volumeConsistency: number;
  speechClarity: number;
  backgroundNoiseLevel: number;
  signalToNoiseRatio: number;
}

export interface ClarityIssue {
  type: ClarityIssueType;
  severity: SegmentSeverity;
  timeSegment: TimeSegment;
  description: string;
  affectedWords: string[];
  suggestion: string;
}

export enum ClarityIssueType {
  MUMBLING = 'mumbling',
  FAST_SPEECH = 'fast_speech',
  LOW_VOLUME = 'low_volume',
  BACKGROUND_NOISE = 'background_noise',
  POOR_ARTICULATION = 'poor_articulation',
  MISPRONUNCIATION = 'mispronunciation',
  UNCLEAR_ENUNCIATION = 'unclear_enunciation'
}

export interface ConfidenceAnalysis {
  score: number;
  metrics: ConfidenceMetrics;
  indicators: ConfidenceIndicator[];
  patterns: ConfidencePattern[];
  recommendations: string[];
}

export interface ConfidenceMetrics {
  overallConfidence: number;
  vocalConfidence: number;
  linguisticConfidence: number;
  temporalConfidence: number;
  consistencyScore: number;
  uncertaintyMarkers: number;
  assertivenessLevel: number;
}

export interface ConfidenceIndicator {
  type: ConfidenceIndicatorType;
  value: number;
  impact: ConfidenceImpact;
  timeSegments: TimeSegment[];
  description: string;
}

export enum ConfidenceIndicatorType {
  VOCAL_PITCH = 'vocal_pitch',
  SPEECH_RATE = 'speech_rate',
  VOLUME_VARIATION = 'volume_variation',
  HESITATION_RATIO = 'hesitation_ratio',
  FILLER_FREQUENCY = 'filler_frequency',
  PAUSE_PATTERNS = 'pause_patterns',
  WORD_CHOICE = 'word_choice',
  SENTENCE_COMPLETION = 'sentence_completion'
}

export enum ConfidenceImpact {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative'
}

export interface ConfidencePattern {
  type: ConfidencePatternType;
  trend: ConfidenceTrend;
  segments: TimeSegment[];
  description: string;
  impact: ConfidenceImpact;
}

export enum ConfidencePatternType {
  BUILDING = 'building',
  DECLINING = 'declining',
  CONSISTENT = 'consistent',
  FLUCTUATING = 'fluctuating',
  RECOVERY = 'recovery'
}

export enum ConfidenceTrend {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export interface EmotionAnalysis {
  score: number;
  primaryEmotion: EmotionType;
  emotions: EmotionScore[];
  emotionalStability: number;
  emotionalRange: EmotionRange;
  recommendations: string[];
}

export interface EmotionScore {
  emotion: EmotionType;
  intensity: number;
  confidence: number;
  timeSegments: TimeSegment[];
  triggers: EmotionTrigger[];
}

export enum EmotionType {
  CONFIDENCE = 'confidence',
  ENTHUSIASM = 'enthusiasm',
  NERVOUSNESS = 'nervousness',
  FRUSTRATION = 'frustration',
  EXCITEMENT = 'excitement',
  ANXIETY = 'anxiety',
  CALMNESS = 'calmness',
  DETERMINATION = 'determination',
  UNCERTAINTY = 'uncertainty',
  SATISFACTION = 'satisfaction'
}

export interface EmotionTrigger {
  trigger: string;
  emotion: EmotionType;
  intensity: number;
  timeSegment: TimeSegment;
}

export interface EmotionRange {
  min: number;
  max: number;
  average: number;
  variance: number;
}

export interface VolumeAnalysis {
  score: number;
  metrics: VolumeMetrics;
  patterns: VolumePattern[];
  recommendations: string[];
}

export interface VolumeMetrics {
  averageVolume: number;
  volumeRange: VolumeRange;
  volumeVariability: number;
  optimalVolumePercentage: number;
  tooQuietSegments: TimeSegment[];
  tooLoudSegments: TimeSegment[];
}

export interface VolumeRange {
  min: number;
  max: number;
  optimal: VolumeOptimalRange;
}

export interface VolumeOptimalRange {
  min: number;
  max: number;
}

export interface VolumePattern {
  type: VolumePatternType;
  segments: TimeSegment[];
  impact: VolumeImpact;
  description: string;
}

export enum VolumePatternType {
  CONSISTENT = 'consistent',
  FADING = 'fading',
  BUILDING = 'building',
  ERRATIC = 'erratic',
  EMPHASIS = 'emphasis'
}

export enum VolumeImpact {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative'
}

export interface SpeechAnalysisConfig {
  whisperApiKey: string;
  whisperBaseUrl: string;
  enableAdvancedAnalysis: boolean;
  fillerWords: FillerWordConfig;
  paceThresholds: PaceThresholds;
  pauseThresholds: PauseThresholds;
  clarityThresholds: ClarityThresholds;
  confidenceThresholds: ConfidenceThresholds;
  volumeThresholds: VolumeThresholds;
}

export interface FillerWordConfig {
  verbal: string[];
  lexical: string[];
  customFillers: string[];
  detectionSensitivity: number;
}

export interface PaceThresholds {
  optimalWPM: PaceRange;
  slowThreshold: number;
  fastThreshold: number;
  variabilityThreshold: number;
}

export interface PauseThresholds {
  minPauseLength: number;
  maxOptimalPause: number;
  hesitationThreshold: number;
  strategicPauseRange: PaceRange;
}

export interface ClarityThresholds {
  minClarityScore: number;
  noiseThreshold: number;
  articulationThreshold: number;
  volumeConsistencyThreshold: number;
}

export interface ConfidenceThresholds {
  minConfidenceScore: number;
  hesitationRatioThreshold: number;
  fillerFrequencyThreshold: number;
  assertivenessThreshold: number;
}

export interface VolumeThresholds {
  optimalRange: VolumeOptimalRange;
  variabilityThreshold: number;
  minAudibleLevel: number;
  maxComfortableLevel: number;
}

export class SpeechAnalysisError extends Error {
  public code: SpeechAnalysisErrorCode;
  public details?: any;

  constructor(params: { code: SpeechAnalysisErrorCode; message: string; details?: any }) {
    super(params.message);
    this.name = 'SpeechAnalysisError';
    this.code = params.code;
    this.details = params.details;
  }
}

export enum SpeechAnalysisErrorCode {
  INVALID_AUDIO_FORMAT = 'INVALID_AUDIO_FORMAT',
  AUDIO_TOO_SHORT = 'AUDIO_TOO_SHORT',
  AUDIO_TOO_LONG = 'AUDIO_TOO_LONG',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  WHISPER_API_ERROR = 'WHISPER_API_ERROR',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INSUFFICIENT_AUDIO_QUALITY = 'INSUFFICIENT_AUDIO_QUALITY'
}

export interface SpeechMetrics {
  wordsPerMinute: number;
  pauseFrequency: number;
  fillerCount: number;
  clarityScore: number;
  confidenceScore: number;
  emotionalStability: number;
}