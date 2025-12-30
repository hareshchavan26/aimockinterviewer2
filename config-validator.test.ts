/**
 * Unit tests for ConfigValidator
 * Tests the validation logic for interview configurations
 */

import { ConfigValidator } from '../validation/config-validator';
import {
  CreateInterviewConfigRequest,
  UpdateInterviewConfigRequest,
  DifficultyLevel,
  QuestionType,
  FocusArea,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
  CreateSessionRequest,
  SessionControlRequest,
  SubmitResponseRequest,
  SessionAction,
} from '../types/interview-config';

describe('ConfigValidator', () => {
  describe('validateCreateConfig', () => {
    const validConfigData: CreateInterviewConfigRequest = {
      name: 'Software Engineer Interview',
      description: 'Technical interview for software engineering position',
      role: 'Software Engineer',
      company: 'Tech Corp',
      industry: 'Technology',
      difficulty: DifficultyLevel.MID,
      duration: 60,
      questionTypes: [QuestionType.TECHNICAL, QuestionType.BEHAVIORAL],
      focusAreas: [FocusArea.TECHNICAL_SKILLS, FocusArea.PROBLEM_SOLVING],
      aiPersonality: {
        name: 'Professional Interviewer',
        style: InterviewStyle.FORMAL,
        tone: InterviewTone.PROFESSIONAL,
        formality: FormalityLevel.SEMI_FORMAL,
        adaptiveness: 0.7,
        followUpIntensity: 0.6,
        encouragementLevel: 0.8,
      },
      settings: {
        allowPause: true,
        allowSkip: true,
        showTimer: true,
        enableRecording: true,
        enableVideoRecording: false,
        enableRealTimeFeedback: false,
        questionRandomization: false,
        adaptiveDifficulty: false,
        maxQuestions: 10,
        timePerQuestion: 300,
        breaksBetweenQuestions: 5,
      },
      tags: ['technical', 'software-engineering'],
    };

    it('should validate a correct configuration', async () => {
      const result = await ConfigValidator.validateCreateConfig(validConfigData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with missing required fields', async () => {
      const invalidData = { ...validConfigData };
      delete (invalidData as any).name;
      delete (invalidData as any).role;

      const result = await ConfigValidator.validateCreateConfig(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
      expect(result.errors.some(e => e.field === 'role')).toBe(true);
    });

    it('should reject configuration with invalid duration', async () => {
      const invalidData = { ...validConfigData, duration: 200 }; // Too long

      const result = await ConfigValidator.validateCreateConfig(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'duration')).toBe(true);
    });

    it('should reject configuration with empty question types', async () => {
      const invalidData = { ...validConfigData, questionTypes: [] };

      const result = await ConfigValidator.validateCreateConfig(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'questionTypes')).toBe(true);
    });

    it('should reject configuration with empty focus areas', async () => {
      const invalidData = { ...validConfigData, focusAreas: [] };

      const result = await ConfigValidator.validateCreateConfig(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'focusAreas')).toBe(true);
    });

    it('should generate warnings for mismatched role and difficulty', async () => {
      const configWithWarning = {
        ...validConfigData,
        role: 'Senior Software Engineer',
        difficulty: DifficultyLevel.ENTRY,
      };

      const result = await ConfigValidator.validateCreateConfig(configWithWarning);
      
      expect(result.isValid).toBe(true); // Still valid, just warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'difficulty')).toBe(true);
    });

    it('should generate warnings for technical questions without technical focus', async () => {
      const configWithWarning = {
        ...validConfigData,
        questionTypes: [QuestionType.TECHNICAL, QuestionType.CODING],
        focusAreas: [FocusArea.COMMUNICATION, FocusArea.TEAMWORK], // No technical skills
      };

      const result = await ConfigValidator.validateCreateConfig(configWithWarning);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'focusAreas')).toBe(true);
    });

    it('should validate settings consistency', async () => {
      const configWithInconsistentSettings = {
        ...validConfigData,
        settings: {
          ...validConfigData.settings!,
          enableVideoRecording: true,
          enableRecording: false, // Inconsistent: video requires audio
        },
      };

      const result = await ConfigValidator.validateCreateConfig(configWithInconsistentSettings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'settings.enableRecording')).toBe(true);
    });
  });

  describe('validateUpdateConfig', () => {
    it('should validate partial update data', async () => {
      const updateData: UpdateInterviewConfigRequest = {
        name: 'Updated Interview Name',
        duration: 90,
      };

      const result = await ConfigValidator.validateUpdateConfig(updateData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid update data', async () => {
      const updateData: UpdateInterviewConfigRequest = {
        duration: 300, // Too long
        questionTypes: [], // Empty array
      };

      const result = await ConfigValidator.validateUpdateConfig(updateData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateCreateSession', () => {
    it('should validate correct session data', () => {
      const sessionData: CreateSessionRequest = {
        configId: '123e4567-e89b-12d3-a456-426614174000',
        settings: {
          allowPause: true,
          showTimer: false,
        },
      };

      const result = ConfigValidator.validateCreateSession(sessionData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject session data with invalid UUID', () => {
      const sessionData: CreateSessionRequest = {
        configId: 'invalid-uuid',
      };

      const result = ConfigValidator.validateCreateSession(sessionData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'configId')).toBe(true);
    });
  });

  describe('validateSessionControl', () => {
    it('should validate correct session control data', () => {
      const controlData: SessionControlRequest = {
        action: SessionAction.START,
        metadata: { source: 'web' },
      };

      const result = ConfigValidator.validateSessionControl(controlData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid session action', () => {
      const controlData = {
        action: 'invalid_action',
      };

      const result = ConfigValidator.validateSessionControl(controlData as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'action')).toBe(true);
    });
  });

  describe('validateSubmitResponse', () => {
    it('should validate response with text', () => {
      const responseData: SubmitResponseRequest = {
        questionId: '123e4567-e89b-12d3-a456-426614174000',
        textResponse: 'This is my answer to the question.',
        metadata: {
          wordCount: 8,
          confidenceLevel: 0.8,
        },
      };

      const result = ConfigValidator.validateSubmitResponse(responseData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate response with audio URL', () => {
      const responseData: SubmitResponseRequest = {
        questionId: '123e4567-e89b-12d3-a456-426614174000',
        audioUrl: 'https://example.com/audio.mp3',
      };

      const result = ConfigValidator.validateSubmitResponse(responseData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject response without any content', () => {
      const responseData: SubmitResponseRequest = {
        questionId: '123e4567-e89b-12d3-a456-426614174000',
        // No textResponse, audioUrl, or videoUrl
      };

      const result = ConfigValidator.validateSubmitResponse(responseData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject response with invalid question ID', () => {
      const responseData: SubmitResponseRequest = {
        questionId: 'invalid-uuid',
        textResponse: 'Some response',
      };

      const result = ConfigValidator.validateSubmitResponse(responseData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'questionId')).toBe(true);
    });
  });

  describe('utility methods', () => {
    describe('isValidUUID', () => {
      it('should validate correct UUIDs', () => {
        const validUUIDs = [
          '123e4567-e89b-12d3-a456-426614174000',
          '550e8400-e29b-41d4-a716-446655440000',
          'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        ];

        validUUIDs.forEach(uuid => {
          expect(ConfigValidator.isValidUUID(uuid)).toBe(true);
        });
      });

      it('should reject invalid UUIDs', () => {
        const invalidUUIDs = [
          'not-a-uuid',
          '123e4567-e89b-12d3-a456',
          '123e4567-e89b-12d3-a456-426614174000-extra',
          '',
        ];

        invalidUUIDs.forEach(uuid => {
          expect(ConfigValidator.isValidUUID(uuid)).toBe(false);
        });
      });
    });

    describe('sanitizeString', () => {
      it('should trim and normalize whitespace', () => {
        expect(ConfigValidator.sanitizeString('  hello   world  ')).toBe('hello world');
        expect(ConfigValidator.sanitizeString('test\n\nstring')).toBe('test string');
        expect(ConfigValidator.sanitizeString('multiple   spaces')).toBe('multiple spaces');
      });
    });

    describe('validateAndSanitizeTags', () => {
      it('should sanitize and validate tags', () => {
        const tags = ['  Technical  ', 'BEHAVIORAL', 'problem-solving', '', 'a'.repeat(50)];
        const result = ConfigValidator.validateAndSanitizeTags(tags);
        
        expect(result).toEqual(['technical', 'behavioral', 'problem-solving']);
        expect(result.length).toBeLessThanOrEqual(10); // MAX_TAGS
      });

      it('should limit number of tags', () => {
        const manyTags = Array.from({ length: 15 }, (_, i) => `tag${i}`);
        const result = ConfigValidator.validateAndSanitizeTags(manyTags);
        
        expect(result.length).toBe(10); // MAX_TAGS
      });
    });
  });
});