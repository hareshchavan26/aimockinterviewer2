/**
 * Text Analysis Types
 * Defines interfaces for text content analysis and evaluation
 */

export interface TextAnalysisRequest {
  text: string;
  context: AnalysisContext;
  options: TextAnalysisOptions;
}

export interface AnalysisContext {
  questionType: QuestionType;
  expectedStructure?: ResponseStructure;
  role?: string;
  industry?: string;
  difficultyLevel?: DifficultyLevel;
}

export enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  SITUATIONAL = 'situational',
  CULTURE_FIT = 'culture_fit',
  PROBLEM_SOLVING = 'problem_solving',
  CASE_STUDY = 'case_study',
  SYSTEM_DESIGN = 'system_design'
}

export enum ResponseStructure {
  STAR = 'star', // Situation, Task, Action, Result
  CAR = 'car',   // Context, Action, Result
  SOAR = 'soar', // Situation, Objective, Action, Result
  FREE_FORM = 'free_form'
}

export enum DifficultyLevel {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  EXECUTIVE = 'executive'
}

export interface TextAnalysisOptions {
  enableContentQuality: boolean;
  enableStructureAnalysis: boolean;
  enableKeywordRelevance: boolean;
  enableSTARMethod: boolean;
  enableGrammarCheck: boolean;
  enableSentimentAnalysis: boolean;
  confidenceThreshold: number;
}

export interface TextAnalysisResult {
  overallScore: number;
  contentQuality: ContentQualityAnalysis;
  structureAnalysis: StructureAnalysis;
  keywordRelevance: KeywordRelevanceAnalysis;
  starMethodAnalysis?: STARMethodAnalysis;
  grammarAnalysis: GrammarAnalysis;
  sentimentAnalysis: SentimentAnalysis;
  recommendations: string[];
  confidence: number;
  processingTime: number;
}

export interface ContentQualityAnalysis {
  score: number;
  metrics: ContentMetrics;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface ContentMetrics {
  wordCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
  vocabularyRichness: number;
  readabilityScore: number;
  specificityScore: number;
  relevanceScore: number;
  depthScore: number;
}

export interface StructureAnalysis {
  score: number;
  hasIntroduction: boolean;
  hasBody: boolean;
  hasConclusion: boolean;
  logicalFlow: number;
  coherence: number;
  transitions: TransitionAnalysis;
  paragraphStructure: ParagraphStructure[];
}

export interface TransitionAnalysis {
  score: number;
  transitionWords: string[];
  flowQuality: number;
  suggestions: string[];
}

export interface ParagraphStructure {
  index: number;
  wordCount: number;
  sentenceCount: number;
  mainIdea: string;
  supportingDetails: number;
  coherenceScore: number;
}

export interface KeywordRelevanceAnalysis {
  score: number;
  relevantKeywords: KeywordMatch[];
  missingKeywords: string[];
  irrelevantContent: string[];
  industryTerms: KeywordMatch[];
  technicalTerms: KeywordMatch[];
}

export interface KeywordMatch {
  keyword: string;
  frequency: number;
  relevanceScore: number;
  context: string[];
  importance: KeywordImportance;
}

export enum KeywordImportance {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface STARMethodAnalysis {
  score: number;
  structure: STARStructure;
  completeness: number;
  balance: STARBalance;
  clarity: STARClarity;
  suggestions: string[];
}

export interface STARStructure {
  situation: STARComponent;
  task: STARComponent;
  action: STARComponent;
  result: STARComponent;
}

export interface STARComponent {
  present: boolean;
  score: number;
  content: string;
  wordCount: number;
  clarity: number;
  specificity: number;
  suggestions: string[];
}

export interface STARBalance {
  score: number;
  situationRatio: number;
  taskRatio: number;
  actionRatio: number;
  resultRatio: number;
  isBalanced: boolean;
  recommendations: string[];
}

export interface STARClarity {
  score: number;
  situationClarity: number;
  taskClarity: number;
  actionClarity: number;
  resultClarity: number;
  overallClarity: number;
}

export interface GrammarAnalysis {
  score: number;
  errors: GrammarError[];
  suggestions: GrammarSuggestion[];
  complexity: GrammarComplexity;
}

export interface GrammarError {
  type: GrammarErrorType;
  message: string;
  position: TextPosition;
  severity: ErrorSeverity;
  suggestion: string;
}

export enum GrammarErrorType {
  SPELLING = 'spelling',
  GRAMMAR = 'grammar',
  PUNCTUATION = 'punctuation',
  STYLE = 'style',
  WORD_CHOICE = 'word_choice'
}

export interface TextPosition {
  start: number;
  end: number;
  line: number;
  column: number;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface GrammarSuggestion {
  type: string;
  message: string;
  example: string;
  priority: number;
}

export interface GrammarComplexity {
  score: number;
  averageSentenceLength: number;
  complexSentences: number;
  passiveVoice: number;
  readabilityLevel: ReadabilityLevel;
}

export enum ReadabilityLevel {
  VERY_EASY = 'very_easy',
  EASY = 'easy',
  FAIRLY_EASY = 'fairly_easy',
  STANDARD = 'standard',
  FAIRLY_DIFFICULT = 'fairly_difficult',
  DIFFICULT = 'difficult',
  VERY_DIFFICULT = 'very_difficult'
}

export interface SentimentAnalysis {
  score: number;
  sentiment: SentimentType;
  confidence: number;
  emotions: EmotionScore[];
  tone: ToneAnalysis;
}

export enum SentimentType {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative'
}

export interface EmotionScore {
  emotion: EmotionType;
  score: number;
  confidence: number;
}

export enum EmotionType {
  CONFIDENCE = 'confidence',
  ENTHUSIASM = 'enthusiasm',
  NERVOUSNESS = 'nervousness',
  FRUSTRATION = 'frustration',
  SATISFACTION = 'satisfaction',
  UNCERTAINTY = 'uncertainty'
}

export interface ToneAnalysis {
  formality: number;
  assertiveness: number;
  enthusiasm: number;
  professionalism: number;
  clarity: number;
}

export interface TextAnalysisConfig {
  enableAdvancedAnalysis: boolean;
  industryKeywords: Record<string, string[]>;
  roleKeywords: Record<string, string[]>;
  starMethodWeights: STARWeights;
  qualityThresholds: QualityThresholds;
  grammarRules: GrammarRuleConfig;
}

export interface STARWeights {
  situation: number;
  task: number;
  action: number;
  result: number;
}

export interface QualityThresholds {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

export interface GrammarRuleConfig {
  enableSpellCheck: boolean;
  enableGrammarCheck: boolean;
  enableStyleCheck: boolean;
  strictness: GrammarStrictness;
}

export enum GrammarStrictness {
  LENIENT = 'lenient',
  MODERATE = 'moderate',
  STRICT = 'strict'
}

export class TextAnalysisError extends Error {
  public code: TextAnalysisErrorCode;
  public details?: any;

  constructor(params: { code: TextAnalysisErrorCode; message: string; details?: any }) {
    super(params.message);
    this.name = 'TextAnalysisError';
    this.code = params.code;
    this.details = params.details;
  }
}

export enum TextAnalysisErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED'
}