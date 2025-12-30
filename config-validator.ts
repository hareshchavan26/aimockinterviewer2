import Joi from 'joi';
import {
  CreateInterviewConfigRequest,
  UpdateInterviewConfigRequest,
  DifficultyLevel,
  QuestionType,
  FocusArea,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CreateSessionRequest,
  SubmitResponseRequest,
  SessionControlRequest,
  SessionAction,
} from '../types/interview-config';

export class ConfigValidator {
  private static readonly MIN_DURATION = 5; // 5 minutes
  private static readonly MAX_DURATION = 180; // 3 hours
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_DESCRIPTION_LENGTH = 500;
  private static readonly MAX_TAGS = 10;
  private static readonly MAX_TAG_LENGTH = 30;

  // Schema definitions
  private static readonly aiPersonalitySchema = Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    style: Joi.string().valid(...Object.values(InterviewStyle)).optional(),
    tone: Joi.string().valid(...Object.values(InterviewTone)).optional(),
    formality: Joi.string().valid(...Object.values(FormalityLevel)).optional(),
    adaptiveness: Joi.number().min(0).max(1).optional(),
    followUpIntensity: Joi.number().min(0).max(1).optional(),
    encouragementLevel: Joi.number().min(0).max(1).optional(),
  });

  private static readonly notificationSettingsSchema = Joi.object({
    timeWarnings: Joi.boolean().optional(),
    warningThresholds: Joi.array().items(Joi.number().min(0).max(100)).max(5).optional(),
    soundEnabled: Joi.boolean().optional(),
    vibrationEnabled: Joi.boolean().optional(),
  });

  private static readonly interviewSettingsSchema = Joi.object({
    allowPause: Joi.boolean().optional(),
    allowSkip: Joi.boolean().optional(),
    showTimer: Joi.boolean().optional(),
    enableRecording: Joi.boolean().optional(),
    enableVideoRecording: Joi.boolean().optional(),
    enableRealTimeFeedback: Joi.boolean().optional(),
    questionRandomization: Joi.boolean().optional(),
    adaptiveDifficulty: Joi.boolean().optional(),
    maxQuestions: Joi.number().min(1).max(100).optional(),
    timePerQuestion: Joi.number().min(30).max(1800).optional(), // 30 seconds to 30 minutes
    breaksBetweenQuestions: Joi.number().min(0).max(300).optional(), // up to 5 minutes
    notifications: this.notificationSettingsSchema.optional(),
  });

  private static readonly createConfigSchema = Joi.object({
    name: Joi.string().min(1).max(this.MAX_NAME_LENGTH).required(),
    description: Joi.string().max(this.MAX_DESCRIPTION_LENGTH).optional(),
    templateId: Joi.string().uuid().optional(),
    role: Joi.string().min(1).max(100).required(),
    company: Joi.string().max(100).optional(),
    industry: Joi.string().min(1).max(100).required(),
    difficulty: Joi.string().valid(...Object.values(DifficultyLevel)).required(),
    duration: Joi.number().min(this.MIN_DURATION).max(this.MAX_DURATION).required(),
    questionTypes: Joi.array()
      .items(Joi.string().valid(...Object.values(QuestionType)))
      .min(1)
      .max(Object.values(QuestionType).length)
      .unique()
      .required(),
    focusAreas: Joi.array()
      .items(Joi.string().valid(...Object.values(FocusArea)))
      .min(1)
      .max(Object.values(FocusArea).length)
      .unique()
      .required(),
    aiPersonality: this.aiPersonalitySchema.optional(),
    settings: this.interviewSettingsSchema.optional(),
    tags: Joi.array()
      .items(Joi.string().min(1).max(this.MAX_TAG_LENGTH))
      .max(this.MAX_TAGS)
      .unique()
      .optional(),
  });

  private static readonly updateConfigSchema = Joi.object({
    name: Joi.string().min(1).max(this.MAX_NAME_LENGTH).optional(),
    description: Joi.string().max(this.MAX_DESCRIPTION_LENGTH).optional(),
    role: Joi.string().min(1).max(100).optional(),
    company: Joi.string().max(100).optional(),
    industry: Joi.string().min(1).max(100).optional(),
    difficulty: Joi.string().valid(...Object.values(DifficultyLevel)).optional(),
    duration: Joi.number().min(this.MIN_DURATION).max(this.MAX_DURATION).optional(),
    questionTypes: Joi.array()
      .items(Joi.string().valid(...Object.values(QuestionType)))
      .min(1)
      .max(Object.values(QuestionType).length)
      .unique()
      .optional(),
    focusAreas: Joi.array()
      .items(Joi.string().valid(...Object.values(FocusArea)))
      .min(1)
      .max(Object.values(FocusArea).length)
      .unique()
      .optional(),
    aiPersonality: this.aiPersonalitySchema.optional(),
    settings: this.interviewSettingsSchema.optional(),
    tags: Joi.array()
      .items(Joi.string().min(1).max(this.MAX_TAG_LENGTH))
      .max(this.MAX_TAGS)
      .unique()
      .optional(),
  });

  private static readonly createSessionSchema = Joi.object({
    configId: Joi.string().uuid().required(),
    settings: this.interviewSettingsSchema.optional(),
  });

  private static readonly sessionControlSchema = Joi.object({
    action: Joi.string().valid(...Object.values(SessionAction)).required(),
    metadata: Joi.object().optional(),
  });

  private static readonly submitResponseSchema = Joi.object({
    questionId: Joi.string().uuid().required(),
    textResponse: Joi.string().max(10000).optional(),
    audioUrl: Joi.string().uri().optional(),
    videoUrl: Joi.string().uri().optional(),
    metadata: Joi.object({
      wordCount: Joi.number().min(0).optional(),
      sentenceCount: Joi.number().min(0).optional(),
      pauseCount: Joi.number().min(0).optional(),
      fillerWords: Joi.number().min(0).optional(),
      speakingRate: Joi.number().min(0).optional(),
      confidenceLevel: Joi.number().min(0).max(1).optional(),
      emotionalTone: Joi.string().optional(),
      keywordsUsed: Joi.array().items(Joi.string()).optional(),
    }).optional(),
  }).or('textResponse', 'audioUrl', 'videoUrl'); // At least one response type required

  /**
   * Validate interview configuration creation request
   */
  static async validateCreateConfig(data: CreateInterviewConfigRequest): Promise<ValidationResult> {
    const { error, value } = this.createConfigSchema.validate(data, { abortEarly: false });
    
    const result: ValidationResult = {
      isValid: !error,
      errors: [],
      warnings: [],
    };

    if (error) {
      result.errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type,
      }));
    }

    // Add business logic validations
    if (value) {
      const businessValidation = await this.validateBusinessRules(value);
      result.errors.push(...businessValidation.errors);
      result.warnings.push(...businessValidation.warnings);
      result.isValid = result.isValid && businessValidation.errors.length === 0;
    }

    return result;
  }

  /**
   * Validate interview configuration update request
   */
  static async validateUpdateConfig(data: UpdateInterviewConfigRequest): Promise<ValidationResult> {
    const { error, value } = this.updateConfigSchema.validate(data, { abortEarly: false });
    
    const result: ValidationResult = {
      isValid: !error,
      errors: [],
      warnings: [],
    };

    if (error) {
      result.errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type,
      }));
    }

    // Add business logic validations for update
    if (value) {
      const businessValidation = await this.validateBusinessRules(value);
      result.errors.push(...businessValidation.errors);
      result.warnings.push(...businessValidation.warnings);
      result.isValid = result.isValid && businessValidation.errors.length === 0;
    }

    return result;
  }

  /**
   * Validate session creation request
   */
  static validateCreateSession(data: CreateSessionRequest): ValidationResult {
    const { error } = this.createSessionSchema.validate(data, { abortEarly: false });
    
    const result: ValidationResult = {
      isValid: !error,
      errors: [],
      warnings: [],
    };

    if (error) {
      result.errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type,
      }));
    }

    return result;
  }

  /**
   * Validate session control request
   */
  static validateSessionControl(data: SessionControlRequest): ValidationResult {
    const { error } = this.sessionControlSchema.validate(data, { abortEarly: false });
    
    const result: ValidationResult = {
      isValid: !error,
      errors: [],
      warnings: [],
    };

    if (error) {
      result.errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type,
      }));
    }

    return result;
  }

  /**
   * Validate response submission request
   */
  static validateSubmitResponse(data: SubmitResponseRequest): ValidationResult {
    const { error } = this.submitResponseSchema.validate(data, { abortEarly: false });
    
    const result: ValidationResult = {
      isValid: !error,
      errors: [],
      warnings: [],
    };

    if (error) {
      result.errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type,
      }));
    }

    return result;
  }

  /**
   * Validate business rules and provide warnings
   */
  private static async validateBusinessRules(data: any): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Duration vs Question Types validation
    if (data.duration && data.questionTypes) {
      const estimatedTimePerQuestion = this.estimateTimePerQuestion(data.questionTypes);
      const totalEstimatedTime = estimatedTimePerQuestion * (data.questionTypes.length * 2); // Assume 2 questions per type
      
      if (totalEstimatedTime > data.duration) {
        warnings.push({
          field: 'duration',
          message: `Duration might be too short for selected question types. Estimated time needed: ${totalEstimatedTime} minutes`,
          suggestion: `Consider increasing duration to at least ${totalEstimatedTime} minutes`,
        });
      }
    }

    // Difficulty vs Role validation
    if (data.difficulty && data.role) {
      const roleValidation = this.validateRoleDifficultyMatch(data.role, data.difficulty);
      if (roleValidation.warning) {
        warnings.push(roleValidation.warning);
      }
    }

    // Question Types vs Focus Areas alignment
    if (data.questionTypes && data.focusAreas) {
      const alignmentValidation = this.validateQuestionTypeFocusAlignment(data.questionTypes, data.focusAreas);
      warnings.push(...alignmentValidation);
    }

    // Settings validation
    if (data.settings) {
      const settingsValidation = this.validateSettingsConsistency(data.settings);
      errors.push(...settingsValidation.errors);
      warnings.push(...settingsValidation.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Estimate time per question based on question types
   */
  private static estimateTimePerQuestion(questionTypes: QuestionType[]): number {
    const timeEstimates: Record<QuestionType, number> = {
      [QuestionType.BEHAVIORAL]: 3,
      [QuestionType.TECHNICAL]: 5,
      [QuestionType.SITUATIONAL]: 4,
      [QuestionType.CASE_STUDY]: 10,
      [QuestionType.CODING]: 15,
      [QuestionType.SYSTEM_DESIGN]: 20,
      [QuestionType.CULTURE_FIT]: 2,
      [QuestionType.LEADERSHIP]: 4,
      [QuestionType.PROBLEM_SOLVING]: 6,
    };

    const totalTime = questionTypes.reduce((sum, type) => sum + timeEstimates[type], 0);
    return Math.ceil(totalTime / questionTypes.length);
  }

  /**
   * Validate role and difficulty level match
   */
  private static validateRoleDifficultyMatch(role: string, difficulty: DifficultyLevel): { warning?: ValidationWarning } {
    const seniorRoles = ['senior', 'lead', 'principal', 'architect', 'manager', 'director', 'vp', 'cto', 'ceo'];
    const juniorRoles = ['intern', 'junior', 'entry', 'associate', 'trainee'];
    
    const roleLower = role.toLowerCase();
    const isSeniorRole = seniorRoles.some(sr => roleLower.includes(sr));
    const isJuniorRole = juniorRoles.some(jr => roleLower.includes(jr));

    if (isSeniorRole && [DifficultyLevel.ENTRY, DifficultyLevel.JUNIOR].includes(difficulty)) {
      return {
        warning: {
          field: 'difficulty',
          message: 'Senior role with entry/junior difficulty level might not provide realistic practice',
          suggestion: 'Consider using mid-level or senior difficulty for senior roles',
        },
      };
    }

    if (isJuniorRole && [DifficultyLevel.SENIOR, DifficultyLevel.PRINCIPAL, DifficultyLevel.EXECUTIVE].includes(difficulty)) {
      return {
        warning: {
          field: 'difficulty',
          message: 'Junior role with senior+ difficulty level might be too challenging',
          suggestion: 'Consider using entry or junior difficulty for junior roles',
        },
      };
    }

    return {};
  }

  /**
   * Validate question types and focus areas alignment
   */
  private static validateQuestionTypeFocusAlignment(questionTypes: QuestionType[], focusAreas: FocusArea[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check if technical question types are selected but no technical focus areas
    const hasTechnicalQuestions = questionTypes.some(qt => 
      [QuestionType.TECHNICAL, QuestionType.CODING, QuestionType.SYSTEM_DESIGN].includes(qt)
    );
    const hasTechnicalFocus = focusAreas.includes(FocusArea.TECHNICAL_SKILLS);

    if (hasTechnicalQuestions && !hasTechnicalFocus) {
      warnings.push({
        field: 'focusAreas',
        message: 'Technical question types selected but no technical skills focus area',
        suggestion: 'Consider adding Technical Skills to focus areas',
      });
    }

    // Check if leadership questions are selected but no leadership focus
    const hasLeadershipQuestions = questionTypes.includes(QuestionType.LEADERSHIP);
    const hasLeadershipFocus = focusAreas.includes(FocusArea.LEADERSHIP);

    if (hasLeadershipQuestions && !hasLeadershipFocus) {
      warnings.push({
        field: 'focusAreas',
        message: 'Leadership questions selected but no leadership focus area',
        suggestion: 'Consider adding Leadership to focus areas',
      });
    }

    return warnings;
  }

  /**
   * Validate settings consistency
   */
  private static validateSettingsConsistency(settings: any): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Video recording requires audio recording
    if (settings.enableVideoRecording && settings.enableRecording === false) {
      errors.push({
        field: 'settings.enableRecording',
        message: 'Audio recording must be enabled when video recording is enabled',
        code: 'INVALID_RECORDING_SETTINGS',
      });
    }

    // Real-time feedback requires recording
    if (settings.enableRealTimeFeedback && !settings.enableRecording) {
      warnings.push({
        field: 'settings.enableRecording',
        message: 'Real-time feedback works best with audio recording enabled',
        suggestion: 'Enable audio recording for better real-time feedback',
      });
    }

    // Time per question vs max questions
    if (settings.timePerQuestion && settings.maxQuestions) {
      const totalTime = (settings.timePerQuestion * settings.maxQuestions) / 60; // Convert to minutes
      if (totalTime > 180) { // 3 hours
        warnings.push({
          field: 'settings.maxQuestions',
          message: `Total interview time (${totalTime.toFixed(0)} minutes) might be too long`,
          suggestion: 'Consider reducing max questions or time per question',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * Validate and sanitize tags
   */
  static validateAndSanitizeTags(tags: string[]): string[] {
    return tags
      .map(tag => this.sanitizeString(tag.toLowerCase()))
      .filter(tag => tag.length > 0 && tag.length <= this.MAX_TAG_LENGTH)
      .slice(0, this.MAX_TAGS);
  }
}