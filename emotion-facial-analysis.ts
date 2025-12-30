/**
 * Emotion and Facial Analysis Types
 * Defines interfaces for emotion detection and facial expression analysis
 */

export interface EmotionFacialAnalysisRequest {
  videoData?: VideoData;
  audioData?: AudioData;
  context: AnalysisContext;
  options: EmotionFacialAnalysisOptions;
}

export interface VideoData {
  buffer: Buffer;
  format: VideoFormat;
  duration: number;
  frameRate: number;
  resolution: VideoResolution;
  codec: string;
}

export interface VideoFormat {
  encoding: VideoEncoding;
  mimeType: string;
  extension: string;
}

export enum VideoEncoding {
  MP4 = 'mp4',
  WEBM = 'webm',
  AVI = 'avi',
  MOV = 'mov',
  MKV = 'mkv'
}

export interface VideoResolution {
  width: number;
  height: number;
}

export interface AudioData {
  buffer: Buffer;
  format: AudioFormat;
  duration: number;
  sampleRate: number;
  channels: number;
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

export interface AnalysisContext {
  questionType: string;
  interviewStage: InterviewStage;
  expectedDuration?: number;
  participantProfile?: ParticipantProfile;
}

export enum InterviewStage {
  INTRODUCTION = 'introduction',
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  SITUATIONAL = 'situational',
  CLOSING = 'closing'
}

export interface ParticipantProfile {
  participantId: string;
  demographicInfo?: DemographicInfo;
  baselineEmotions?: EmotionBaseline;
  previousAnalyses?: EmotionFacialResult[];
}

export interface DemographicInfo {
  ageRange?: string;
  gender?: string;
  ethnicity?: string;
  culturalBackground?: string;
}

export interface EmotionBaseline {
  neutralExpression: FacialLandmarks;
  baselineEmotions: EmotionIntensity[];
  voiceBaseline: VoiceEmotionBaseline;
}

export interface EmotionFacialAnalysisOptions {
  enableVoiceEmotionDetection: boolean;
  enableFacialExpressionAnalysis: boolean;
  enableMicroExpressionDetection: boolean;
  enableGazeTracking: boolean;
  enablePostureAnalysis: boolean;
  enableConfidenceAssessment: boolean;
  enableEmotionCorrelation: boolean;
  confidenceThreshold: number;
  faceApiModel: FaceApiModel;
  emotionSensitivity: EmotionSensitivity;
}

export enum FaceApiModel {
  TINY = 'tiny',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export enum EmotionSensitivity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface EmotionFacialResult {
  overallScore: number;
  voiceEmotionAnalysis: VoiceEmotionAnalysis;
  facialExpressionAnalysis: FacialExpressionAnalysis;
  microExpressionAnalysis: MicroExpressionAnalysis;
  gazeAnalysis: GazeAnalysis;
  postureAnalysis: PostureAnalysis;
  confidenceAssessment: ConfidenceAssessment;
  emotionCorrelation: EmotionCorrelation;
  recommendations: string[];
  confidence: number;
  processingTime: number;
}

export interface VoiceEmotionAnalysis {
  score: number;
  primaryEmotion: EmotionType;
  emotions: VoiceEmotionScore[];
  emotionalStability: number;
  emotionalIntensity: number;
  emotionalRange: EmotionRange;
  voiceCharacteristics: VoiceCharacteristics;
  temporalPatterns: EmotionTemporalPattern[];
  recommendations: string[];
}

export interface VoiceEmotionScore {
  emotion: EmotionType;
  intensity: number;
  confidence: number;
  timeSegments: TimeSegment[];
  voiceFeatures: VoiceFeature[];
}

export enum EmotionType {
  HAPPINESS = 'happiness',
  SADNESS = 'sadness',
  ANGER = 'anger',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
  CONTEMPT = 'contempt',
  NEUTRAL = 'neutral',
  CONFIDENCE = 'confidence',
  NERVOUSNESS = 'nervousness',
  ENTHUSIASM = 'enthusiasm',
  FRUSTRATION = 'frustration',
  EXCITEMENT = 'excitement',
  ANXIETY = 'anxiety',
  CALMNESS = 'calmness',
  DETERMINATION = 'determination',
  UNCERTAINTY = 'uncertainty',
  SATISFACTION = 'satisfaction'
}

export interface TimeSegment {
  start: number;
  end: number;
  value: number;
  metadata?: any;
}

export interface VoiceFeature {
  feature: VoiceFeatureType;
  value: number;
  confidence: number;
  description: string;
}

export enum VoiceFeatureType {
  PITCH = 'pitch',
  TONE = 'tone',
  PACE = 'pace',
  VOLUME = 'volume',
  TREMOR = 'tremor',
  BREATHINESS = 'breathiness',
  ROUGHNESS = 'roughness',
  STRAIN = 'strain'
}

export interface EmotionRange {
  min: number;
  max: number;
  average: number;
  variance: number;
}

export interface VoiceCharacteristics {
  fundamentalFrequency: FrequencyAnalysis;
  spectralFeatures: SpectralFeatures;
  prosodyFeatures: ProsodyFeatures;
  qualityFeatures: VoiceQualityFeatures;
}

export interface FrequencyAnalysis {
  meanF0: number;
  f0Range: number;
  f0Variance: number;
  jitter: number;
  shimmer: number;
}

export interface SpectralFeatures {
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
  mfccCoefficients: number[];
}

export interface ProsodyFeatures {
  rhythmVariability: number;
  stressPatterns: StressPattern[];
  intonationContour: number[];
}

export interface StressPattern {
  position: number;
  intensity: number;
  type: StressType;
}

export enum StressType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  UNSTRESSED = 'unstressed'
}

export interface VoiceQualityFeatures {
  breathiness: number;
  roughness: number;
  strain: number;
  nasality: number;
  creakiness: number;
}

export interface EmotionTemporalPattern {
  pattern: TemporalPatternType;
  duration: number;
  intensity: number;
  emotions: EmotionType[];
  significance: PatternSignificance;
}

export enum TemporalPatternType {
  STABLE = 'stable',
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  FLUCTUATING = 'fluctuating',
  PEAK = 'peak',
  VALLEY = 'valley'
}

export enum PatternSignificance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface FacialExpressionAnalysis {
  score: number;
  primaryExpression: FacialExpression;
  expressions: FacialExpressionScore[];
  facialLandmarks: FacialLandmarks[];
  expressionStability: number;
  expressionIntensity: number;
  facialMovements: FacialMovement[];
  eyeContactAnalysis: EyeContactAnalysis;
  recommendations: string[];
}

export interface FacialExpressionScore {
  expression: FacialExpression;
  intensity: number;
  confidence: number;
  timeSegments: TimeSegment[];
  facialRegions: FacialRegionScore[];
}

export enum FacialExpression {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  FEARFUL = 'fearful',
  SURPRISED = 'surprised',
  DISGUSTED = 'disgusted',
  NEUTRAL = 'neutral',
  CONFIDENT = 'confident',
  NERVOUS = 'nervous',
  FOCUSED = 'focused',
  CONFUSED = 'confused',
  INTERESTED = 'interested',
  BORED = 'bored'
}

export interface FacialRegionScore {
  region: FacialRegion;
  intensity: number;
  contribution: number;
  landmarks: FacialLandmark[];
}

export enum FacialRegion {
  FOREHEAD = 'forehead',
  EYEBROWS = 'eyebrows',
  EYES = 'eyes',
  NOSE = 'nose',
  CHEEKS = 'cheeks',
  MOUTH = 'mouth',
  JAW = 'jaw',
  CHIN = 'chin'
}

export interface FacialLandmark {
  id: number;
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface FacialLandmarks {
  timestamp: number;
  landmarks: FacialLandmark[];
  boundingBox: BoundingBox;
  faceQuality: FaceQuality;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface FaceQuality {
  sharpness: number;
  brightness: number;
  contrast: number;
  pose: FacePose;
  occlusion: FaceOcclusion;
}

export interface FacePose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceOcclusion {
  leftEye: number;
  rightEye: number;
  nose: number;
  mouth: number;
  overall: number;
}

export interface FacialMovement {
  type: MovementType;
  intensity: number;
  duration: number;
  frequency: number;
  regions: FacialRegion[];
  significance: MovementSignificance;
}

export enum MovementType {
  BLINK = 'blink',
  EYEBROW_RAISE = 'eyebrow_raise',
  EYEBROW_FURROW = 'eyebrow_furrow',
  SMILE = 'smile',
  FROWN = 'frown',
  LIP_BITE = 'lip_bite',
  HEAD_NOD = 'head_nod',
  HEAD_SHAKE = 'head_shake',
  HEAD_TILT = 'head_tilt'
}

export enum MovementSignificance {
  NORMAL = 'normal',
  NOTABLE = 'notable',
  SIGNIFICANT = 'significant',
  CONCERNING = 'concerning'
}

export interface EyeContactAnalysis {
  score: number;
  totalEyeContactTime: number;
  eyeContactPercentage: number;
  eyeContactPatterns: EyeContactPattern[];
  gazeDirection: GazeDirection[];
  blinkAnalysis: BlinkAnalysis;
  recommendations: string[];
}

export interface EyeContactPattern {
  type: EyeContactType;
  duration: number;
  frequency: number;
  timing: TimeSegment[];
  quality: EyeContactQuality;
}

export enum EyeContactType {
  DIRECT = 'direct',
  AVOIDANT = 'avoidant',
  INTERMITTENT = 'intermittent',
  SUSTAINED = 'sustained',
  DARTING = 'darting'
}

export enum EyeContactQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export interface GazeDirection {
  timestamp: number;
  direction: GazeVector;
  confidence: number;
  target: GazeTarget;
}

export interface GazeVector {
  x: number;
  y: number;
  z: number;
}

export enum GazeTarget {
  CAMERA = 'camera',
  SCREEN = 'screen',
  AWAY = 'away',
  DOWN = 'down',
  UP = 'up',
  LEFT = 'left',
  RIGHT = 'right'
}

export interface BlinkAnalysis {
  blinkRate: number;
  averageBlinkDuration: number;
  blinkPatterns: BlinkPattern[];
  abnormalBlinks: AbnormalBlink[];
}

export interface BlinkPattern {
  type: BlinkPatternType;
  frequency: number;
  significance: PatternSignificance;
}

export enum BlinkPatternType {
  NORMAL = 'normal',
  RAPID = 'rapid',
  SLOW = 'slow',
  IRREGULAR = 'irregular'
}

export interface AbnormalBlink {
  timestamp: number;
  type: AbnormalBlinkType;
  duration: number;
  intensity: number;
}

export enum AbnormalBlinkType {
  PROLONGED = 'prolonged',
  PARTIAL = 'partial',
  FORCED = 'forced',
  ASYMMETRIC = 'asymmetric'
}

export interface MicroExpressionAnalysis {
  score: number;
  detectedMicroExpressions: MicroExpression[];
  suppressedEmotions: SuppressedEmotion[];
  authenticity: AuthenticityAssessment;
  recommendations: string[];
}

export interface MicroExpression {
  expression: FacialExpression;
  intensity: number;
  duration: number;
  timestamp: number;
  confidence: number;
  facialRegions: FacialRegion[];
  significance: MicroExpressionSignificance;
}

export enum MicroExpressionSignificance {
  MINIMAL = 'minimal',
  NOTABLE = 'notable',
  SIGNIFICANT = 'significant',
  CRITICAL = 'critical'
}

export interface SuppressedEmotion {
  emotion: EmotionType;
  intensity: number;
  suppressionLevel: number;
  timeSegments: TimeSegment[];
  indicators: SuppressionIndicator[];
}

export interface SuppressionIndicator {
  type: SuppressionType;
  strength: number;
  confidence: number;
  description: string;
}

export enum SuppressionType {
  FACIAL_TENSION = 'facial_tension',
  FORCED_SMILE = 'forced_smile',
  CONTROLLED_EXPRESSION = 'controlled_expression',
  MICRO_LEAK = 'micro_leak'
}

export interface AuthenticityAssessment {
  score: number;
  genuineExpressions: number;
  forcedExpressions: number;
  inconsistencies: ExpressionInconsistency[];
  overallAuthenticity: AuthenticityLevel;
}

export enum AuthenticityLevel {
  VERY_AUTHENTIC = 'very_authentic',
  AUTHENTIC = 'authentic',
  SOMEWHAT_AUTHENTIC = 'somewhat_authentic',
  QUESTIONABLE = 'questionable',
  INAUTHENTIC = 'inauthentic'
}

export interface ExpressionInconsistency {
  type: InconsistencyType;
  severity: InconsistencySeverity;
  timeSegment: TimeSegment;
  description: string;
}

export enum InconsistencyType {
  VOICE_FACE_MISMATCH = 'voice_face_mismatch',
  EXPRESSION_CONTEXT_MISMATCH = 'expression_context_mismatch',
  TEMPORAL_INCONSISTENCY = 'temporal_inconsistency',
  INTENSITY_MISMATCH = 'intensity_mismatch'
}

export enum InconsistencySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface GazeAnalysis {
  score: number;
  gazePatterns: GazePattern[];
  attentionFocus: AttentionFocus[];
  gazeStability: number;
  recommendations: string[];
}

export interface GazePattern {
  type: GazePatternType;
  duration: number;
  frequency: number;
  quality: GazeQuality;
  significance: PatternSignificance;
}

export enum GazePatternType {
  STEADY = 'steady',
  WANDERING = 'wandering',
  FOCUSED = 'focused',
  AVOIDANT = 'avoidant',
  SEARCHING = 'searching'
}

export enum GazeQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export interface AttentionFocus {
  target: GazeTarget;
  duration: number;
  percentage: number;
  quality: AttentionQuality;
}

export enum AttentionQuality {
  HIGHLY_FOCUSED = 'highly_focused',
  FOCUSED = 'focused',
  MODERATELY_FOCUSED = 'moderately_focused',
  UNFOCUSED = 'unfocused'
}

export interface PostureAnalysis {
  score: number;
  bodyPosture: BodyPosture;
  headPosition: HeadPosition;
  postureStability: number;
  postureChanges: PostureChange[];
  recommendations: string[];
}

export interface BodyPosture {
  alignment: PostureAlignment;
  openness: PostureOpenness;
  confidence: PostureConfidence;
  engagement: PostureEngagement;
}

export enum PostureAlignment {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  VERY_POOR = 'very_poor'
}

export enum PostureOpenness {
  VERY_OPEN = 'very_open',
  OPEN = 'open',
  NEUTRAL = 'neutral',
  CLOSED = 'closed',
  VERY_CLOSED = 'very_closed'
}

export enum PostureConfidence {
  VERY_CONFIDENT = 'very_confident',
  CONFIDENT = 'confident',
  NEUTRAL = 'neutral',
  UNCERTAIN = 'uncertain',
  VERY_UNCERTAIN = 'very_uncertain'
}

export enum PostureEngagement {
  HIGHLY_ENGAGED = 'highly_engaged',
  ENGAGED = 'engaged',
  MODERATELY_ENGAGED = 'moderately_engaged',
  DISENGAGED = 'disengaged',
  VERY_DISENGAGED = 'very_disengaged'
}

export interface HeadPosition {
  angle: FacePose;
  stability: number;
  naturalness: HeadPositionNaturalness;
}

export enum HeadPositionNaturalness {
  VERY_NATURAL = 'very_natural',
  NATURAL = 'natural',
  SOMEWHAT_NATURAL = 'somewhat_natural',
  UNNATURAL = 'unnatural',
  VERY_UNNATURAL = 'very_unnatural'
}

export interface PostureChange {
  timestamp: number;
  type: PostureChangeType;
  magnitude: number;
  duration: number;
  significance: ChangeSignificance;
}

export enum PostureChangeType {
  LEAN_FORWARD = 'lean_forward',
  LEAN_BACK = 'lean_back',
  SHIFT_LEFT = 'shift_left',
  SHIFT_RIGHT = 'shift_right',
  STRAIGHTEN = 'straighten',
  SLOUCH = 'slouch'
}

export enum ChangeSignificance {
  MINIMAL = 'minimal',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  DRAMATIC = 'dramatic'
}

export interface ConfidenceAssessment {
  overallConfidence: number;
  voiceConfidence: number;
  facialConfidence: number;
  postureConfidence: number;
  confidenceIndicators: ConfidenceIndicator[];
  confidencePatterns: ConfidencePattern[];
  recommendations: string[];
}

export interface ConfidenceIndicator {
  type: ConfidenceIndicatorType;
  value: number;
  weight: number;
  contribution: number;
  timeSegments: TimeSegment[];
}

export enum ConfidenceIndicatorType {
  VOICE_STEADINESS = 'voice_steadiness',
  FACIAL_COMPOSURE = 'facial_composure',
  EYE_CONTACT_QUALITY = 'eye_contact_quality',
  POSTURE_STABILITY = 'posture_stability',
  EXPRESSION_AUTHENTICITY = 'expression_authenticity',
  GESTURE_CONTROL = 'gesture_control'
}

export interface ConfidencePattern {
  type: ConfidencePatternType;
  trend: ConfidenceTrend;
  duration: number;
  intensity: number;
  significance: PatternSignificance;
}

export enum ConfidencePatternType {
  BUILDING = 'building',
  DECLINING = 'declining',
  STABLE = 'stable',
  FLUCTUATING = 'fluctuating',
  RECOVERING = 'recovering'
}

export enum ConfidenceTrend {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export interface EmotionCorrelation {
  score: number;
  voiceFaceCorrelation: ModalityCorrelation;
  emotionConsistency: EmotionConsistency;
  multiModalPatterns: MultiModalPattern[];
  discrepancies: ModalityDiscrepancy[];
  recommendations: string[];
}

export interface ModalityCorrelation {
  correlation: number;
  confidence: number;
  consistentEmotions: EmotionType[];
  inconsistentEmotions: EmotionType[];
}

export interface EmotionConsistency {
  overall: number;
  temporal: number;
  intensity: number;
  authenticity: number;
}

export interface MultiModalPattern {
  pattern: MultiModalPatternType;
  modalities: AnalysisModality[];
  strength: number;
  duration: number;
  significance: PatternSignificance;
}

export enum MultiModalPatternType {
  REINFORCING = 'reinforcing',
  CONFLICTING = 'conflicting',
  COMPLEMENTARY = 'complementary',
  INDEPENDENT = 'independent'
}

export enum AnalysisModality {
  VOICE = 'voice',
  FACIAL = 'facial',
  POSTURE = 'posture',
  GAZE = 'gaze'
}

export interface ModalityDiscrepancy {
  modalities: AnalysisModality[];
  discrepancyType: DiscrepancyType;
  severity: DiscrepancySeverity;
  timeSegment: TimeSegment;
  description: string;
}

export enum DiscrepancyType {
  EMOTION_MISMATCH = 'emotion_mismatch',
  INTENSITY_MISMATCH = 'intensity_mismatch',
  TIMING_MISMATCH = 'timing_mismatch',
  AUTHENTICITY_MISMATCH = 'authenticity_mismatch'
}

export enum DiscrepancySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface EmotionFacialConfig {
  enableAdvancedAnalysis: boolean;
  faceApiSettings: FaceApiSettings;
  emotionThresholds: EmotionThresholds;
  confidenceThresholds: ConfidenceThresholds;
  correlationThresholds: CorrelationThresholds;
}

export interface FaceApiSettings {
  modelPath: string;
  detectionThreshold: number;
  landmarkThreshold: number;
  expressionThreshold: number;
  maxFaces: number;
}

export interface EmotionThresholds {
  minIntensity: number;
  maxIntensity: number;
  stabilityThreshold: number;
  changeThreshold: number;
}

export interface ConfidenceThresholds {
  minConfidence: number;
  highConfidence: number;
  stabilityThreshold: number;
}

export interface CorrelationThresholds {
  minCorrelation: number;
  highCorrelation: number;
  discrepancyThreshold: number;
}

export interface EmotionIntensity {
  emotion: EmotionType;
  intensity: number;
}

export interface VoiceEmotionBaseline {
  baselineEmotions: EmotionIntensity[];
  voiceCharacteristics: VoiceCharacteristics;
}

export class EmotionFacialAnalysisError extends Error {
  public code: EmotionFacialAnalysisErrorCode;
  public details?: any;

  constructor(params: { code: EmotionFacialAnalysisErrorCode; message: string; details?: any }) {
    super(params.message);
    this.name = 'EmotionFacialAnalysisError';
    this.code = params.code;
    this.details = params.details;
  }
}

export enum EmotionFacialAnalysisErrorCode {
  INVALID_VIDEO_FORMAT = 'INVALID_VIDEO_FORMAT',
  INVALID_AUDIO_FORMAT = 'INVALID_AUDIO_FORMAT',
  NO_FACE_DETECTED = 'NO_FACE_DETECTED',
  POOR_VIDEO_QUALITY = 'POOR_VIDEO_QUALITY',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  FACE_API_ERROR = 'FACE_API_ERROR',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}