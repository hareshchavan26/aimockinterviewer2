import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  InterviewConfig,
  InterviewTemplate,
  Question,
  InterviewSession,
  SessionResponse,
  CreateInterviewConfigRequest,
  UpdateInterviewConfigRequest,
  CreateSessionRequest,
  SubmitResponseRequest,
  TemplateFilters,
  InterviewConfigRepository,
  DifficultyLevel,
  QuestionType,
  FocusArea,
  SessionState,
  AIPersonality,
  InterviewSettings,
  InterviewStyle,
  InterviewTone,
  FormalityLevel,
} from '../types/interview-config';

export class DatabaseInterviewConfigRepository implements InterviewConfigRepository {
  constructor(private pool: Pool) {}

  // Configuration operations
  async createConfig(userId: string, configData: CreateInterviewConfigRequest): Promise<InterviewConfig> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const configId = uuidv4();
      const now = new Date();

      // Set default AI personality if not provided
      const defaultAIPersonality: AIPersonality = {
        name: 'Professional Interviewer',
        style: InterviewStyle.FORMAL,
        tone: InterviewTone.PROFESSIONAL,
        formality: FormalityLevel.SEMI_FORMAL,
        adaptiveness: 0.7,
        followUpIntensity: 0.6,
        encouragementLevel: 0.8,
        ...configData.aiPersonality,
      };

      // Set default settings if not provided
      const defaultSettings: InterviewSettings = {
        allowPause: true,
        allowSkip: true,
        showTimer: true,
        enableRecording: true,
        enableVideoRecording: false,
        enableRealTimeFeedback: false,
        questionRandomization: false,
        adaptiveDifficulty: false,
        breaksBetweenQuestions: 5,
        notifications: {
          timeWarnings: true,
          warningThresholds: [75, 90],
          soundEnabled: true,
          vibrationEnabled: false,
        },
        ...configData.settings,
      };

      const insertConfigQuery = `
        INSERT INTO interview_configs (
          id, user_id, name, description, template_id, role, company, industry,
          difficulty, duration, question_types, focus_areas, ai_personality,
          settings, is_template, is_public, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const configValues = [
        configId,
        userId,
        configData.name,
        configData.description || null,
        configData.templateId || null,
        configData.role,
        configData.company || null,
        configData.industry,
        configData.difficulty,
        configData.duration,
        JSON.stringify(configData.questionTypes),
        JSON.stringify(configData.focusAreas),
        JSON.stringify(defaultAIPersonality),
        JSON.stringify(defaultSettings),
        false, // is_template
        false, // is_public
        JSON.stringify(configData.tags || []),
        now,
        now,
      ];

      const result = await client.query(insertConfigQuery, configValues);
      await client.query('COMMIT');

      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findConfigById(configId: string): Promise<InterviewConfig | null> {
    const query = 'SELECT * FROM interview_configs WHERE id = $1';
    const result = await this.pool.query(query, [configId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConfig(result.rows[0]);
  }

  async findConfigsByUserId(userId: string): Promise<InterviewConfig[]> {
    const query = `
      SELECT * FROM interview_configs 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => this.mapRowToConfig(row));
  }

  async updateConfig(configId: string, configData: UpdateInterviewConfigRequest): Promise<InterviewConfig> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // First, get the existing config
      const existingConfig = await this.findConfigById(configId);
      if (!existingConfig) {
        throw new Error('Configuration not found');
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (configData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(configData.name);
      }

      if (configData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(configData.description);
      }

      if (configData.role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        updateValues.push(configData.role);
      }

      if (configData.company !== undefined) {
        updateFields.push(`company = $${paramIndex++}`);
        updateValues.push(configData.company);
      }

      if (configData.industry !== undefined) {
        updateFields.push(`industry = $${paramIndex++}`);
        updateValues.push(configData.industry);
      }

      if (configData.difficulty !== undefined) {
        updateFields.push(`difficulty = $${paramIndex++}`);
        updateValues.push(configData.difficulty);
      }

      if (configData.duration !== undefined) {
        updateFields.push(`duration = $${paramIndex++}`);
        updateValues.push(configData.duration);
      }

      if (configData.questionTypes !== undefined) {
        updateFields.push(`question_types = $${paramIndex++}`);
        updateValues.push(JSON.stringify(configData.questionTypes));
      }

      if (configData.focusAreas !== undefined) {
        updateFields.push(`focus_areas = $${paramIndex++}`);
        updateValues.push(JSON.stringify(configData.focusAreas));
      }

      if (configData.aiPersonality !== undefined) {
        const updatedPersonality = { ...existingConfig.aiPersonality, ...configData.aiPersonality };
        updateFields.push(`ai_personality = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updatedPersonality));
      }

      if (configData.settings !== undefined) {
        const updatedSettings = { ...existingConfig.settings, ...configData.settings };
        updateFields.push(`settings = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updatedSettings));
      }

      if (configData.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        updateValues.push(JSON.stringify(configData.tags));
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(new Date());

      // Add the config ID for the WHERE clause
      updateValues.push(configId);

      const updateQuery = `
        UPDATE interview_configs 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');

      return this.mapRowToConfig(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteConfig(configId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete related sessions first (cascade delete)
      await client.query('DELETE FROM interview_sessions WHERE config_id = $1', [configId]);
      
      // Delete the configuration
      const result = await client.query('DELETE FROM interview_configs WHERE id = $1', [configId]);
      
      if (result.rowCount === 0) {
        throw new Error('Configuration not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Template operations
  async findTemplateById(templateId: string): Promise<InterviewTemplate | null> {
    const query = `
      SELECT t.*, 
             COUNT(q.id) as question_count,
             AVG(COALESCE(t.rating, 0)) as avg_rating
      FROM interview_templates t
      LEFT JOIN template_questions q ON t.id = q.template_id
      WHERE t.id = $1
      GROUP BY t.id
    `;
    const result = await this.pool.query(query, [templateId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTemplate(result.rows[0]);
  }

  async findTemplatesByRole(role: string): Promise<InterviewTemplate[]> {
    const query = `
      SELECT t.*, 
             COUNT(q.id) as question_count,
             AVG(COALESCE(t.rating, 0)) as avg_rating
      FROM interview_templates t
      LEFT JOIN template_questions q ON t.id = q.template_id
      WHERE LOWER(t.role) LIKE LOWER($1) AND t.is_public = true
      GROUP BY t.id
      ORDER BY t.usage_count DESC, t.rating DESC
    `;
    const result = await this.pool.query(query, [`%${role}%`]);
    
    return result.rows.map(row => this.mapRowToTemplate(row));
  }

  async findTemplatesByIndustry(industry: string): Promise<InterviewTemplate[]> {
    const query = `
      SELECT t.*, 
             COUNT(q.id) as question_count,
             AVG(COALESCE(t.rating, 0)) as avg_rating
      FROM interview_templates t
      LEFT JOIN template_questions q ON t.id = q.template_id
      WHERE LOWER(t.industry) LIKE LOWER($1) AND t.is_public = true
      GROUP BY t.id
      ORDER BY t.usage_count DESC, t.rating DESC
    `;
    const result = await this.pool.query(query, [`%${industry}%`]);
    
    return result.rows.map(row => this.mapRowToTemplate(row));
  }

  async searchTemplates(query: string, filters?: TemplateFilters): Promise<InterviewTemplate[]> {
    let sqlQuery = `
      SELECT t.*, 
             COUNT(q.id) as question_count,
             AVG(COALESCE(t.rating, 0)) as avg_rating
      FROM interview_templates t
      LEFT JOIN template_questions q ON t.id = q.template_id
      WHERE t.is_public = true
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add search query
    if (query) {
      sqlQuery += ` AND (
        LOWER(t.name) LIKE LOWER($${paramIndex}) OR 
        LOWER(t.description) LIKE LOWER($${paramIndex}) OR 
        LOWER(t.role) LIKE LOWER($${paramIndex}) OR 
        LOWER(t.industry) LIKE LOWER($${paramIndex})
      )`;
      queryParams.push(`%${query}%`);
      paramIndex++;
    }

    // Add filters
    if (filters) {
      if (filters.role) {
        sqlQuery += ` AND LOWER(t.role) LIKE LOWER($${paramIndex})`;
        queryParams.push(`%${filters.role}%`);
        paramIndex++;
      }

      if (filters.industry) {
        sqlQuery += ` AND LOWER(t.industry) LIKE LOWER($${paramIndex})`;
        queryParams.push(`%${filters.industry}%`);
        paramIndex++;
      }

      if (filters.difficulty) {
        sqlQuery += ` AND t.difficulty = $${paramIndex}`;
        queryParams.push(filters.difficulty);
        paramIndex++;
      }

      if (filters.duration) {
        if (filters.duration.min) {
          sqlQuery += ` AND t.estimated_duration >= $${paramIndex}`;
          queryParams.push(filters.duration.min);
          paramIndex++;
        }
        if (filters.duration.max) {
          sqlQuery += ` AND t.estimated_duration <= $${paramIndex}`;
          queryParams.push(filters.duration.max);
          paramIndex++;
        }
      }
    }

    sqlQuery += `
      GROUP BY t.id
      ORDER BY t.usage_count DESC, t.rating DESC
      LIMIT 50
    `;

    const result = await this.pool.query(sqlQuery, queryParams);
    return result.rows.map(row => this.mapRowToTemplate(row));
  }

  // Question operations
  async findQuestionsByConfigId(configId: string): Promise<Question[]> {
    const query = `
      SELECT * FROM questions 
      WHERE config_id = $1 
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query, [configId]);
    
    return result.rows.map(row => this.mapRowToQuestion(row));
  }

  async findQuestionsByTemplateId(templateId: string): Promise<Question[]> {
    const query = `
      SELECT * FROM template_questions 
      WHERE template_id = $1 
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query, [templateId]);
    
    return result.rows.map(row => this.mapRowToQuestion(row));
  }

  async createQuestion(questionData: Partial<Question>): Promise<Question> {
    const questionId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO questions (
        id, config_id, template_id, type, category, difficulty, text, context,
        expected_answer_structure, evaluation_criteria, follow_up_questions,
        time_limit, tags, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      questionId,
      questionData.configId || null,
      questionData.templateId || null,
      questionData.type,
      questionData.category,
      questionData.difficulty,
      questionData.text,
      questionData.context || null,
      questionData.expectedAnswerStructure || null,
      JSON.stringify(questionData.evaluationCriteria || []),
      JSON.stringify(questionData.followUpQuestions || []),
      questionData.timeLimit || null,
      JSON.stringify(questionData.tags || []),
      JSON.stringify(questionData.metadata || {}),
      now,
      now,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToQuestion(result.rows[0]);
  }

  async updateQuestion(questionId: string, questionData: Partial<Question>): Promise<Question> {
    // Implementation similar to updateConfig but for questions
    // Simplified for brevity
    const query = `
      UPDATE questions 
      SET text = COALESCE($2, text),
          context = COALESCE($3, context),
          updated_at = $4
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      questionId,
      questionData.text,
      questionData.context,
      new Date(),
    ];

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Question not found');
    }

    return this.mapRowToQuestion(result.rows[0]);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const result = await this.pool.query('DELETE FROM questions WHERE id = $1', [questionId]);
    if (result.rowCount === 0) {
      throw new Error('Question not found');
    }
  }

  // Session operations
  async createSession(userId: string, sessionData: CreateSessionRequest): Promise<InterviewSession> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionId = uuidv4();
      const now = new Date();

      // Get the configuration
      const config = await this.findConfigById(sessionData.configId);
      if (!config) {
        throw new Error('Configuration not found');
      }

      // Get questions for this configuration (or from template)
      let questions: Question[] = [];
      if (config.templateId) {
        questions = await this.findQuestionsByTemplateId(config.templateId);
      } else {
        questions = await this.findQuestionsByConfigId(config.id);
      }

      const insertSessionQuery = `
        INSERT INTO interview_sessions (
          id, user_id, config_id, state, current_question_index, questions,
          started_at, duration, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const sessionValues = [
        sessionId,
        userId,
        sessionData.configId,
        SessionState.CREATED,
        0,
        JSON.stringify(questions),
        now,
        0,
        JSON.stringify({
          userAgent: 'unknown',
          deviceType: 'unknown',
          interruptions: 0,
          technicalIssues: [],
        }),
      ];

      const result = await client.query(insertSessionQuery, sessionValues);
      await client.query('COMMIT');

      const session = this.mapRowToSession(result.rows[0]);
      session.config = config;
      session.questions = questions;

      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findSessionById(sessionId: string): Promise<InterviewSession | null> {
    const query = `
      SELECT s.*, c.* as config
      FROM interview_sessions s
      JOIN interview_configs c ON s.config_id = c.id
      WHERE s.id = $1
    `;
    const result = await this.pool.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const session = this.mapRowToSession(result.rows[0]);
    session.config = this.mapRowToConfig(result.rows[0]);
    
    // Get questions
    session.questions = JSON.parse(result.rows[0].questions || '[]');
    
    // Get responses
    session.responses = await this.findResponsesBySessionId(sessionId);

    return session;
  }

  async findSessionsByUserId(userId: string): Promise<InterviewSession[]> {
    const query = `
      SELECT s.*, c.name as config_name, c.role, c.industry
      FROM interview_sessions s
      JOIN interview_configs c ON s.config_id = c.id
      WHERE s.user_id = $1
      ORDER BY s.started_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => {
      const session = this.mapRowToSession(row);
      // Simplified config for list view
      session.config = {
        id: row.config_id,
        name: row.config_name,
        role: row.role,
        industry: row.industry,
      } as InterviewConfig;
      return session;
    });
  }

  async updateSession(sessionId: string, sessionData: Partial<InterviewSession>): Promise<InterviewSession> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (sessionData.state !== undefined) {
      updateFields.push(`state = $${paramIndex++}`);
      updateValues.push(sessionData.state);
    }

    if (sessionData.currentQuestionIndex !== undefined) {
      updateFields.push(`current_question_index = $${paramIndex++}`);
      updateValues.push(sessionData.currentQuestionIndex);
    }

    if (sessionData.pausedAt !== undefined) {
      updateFields.push(`paused_at = $${paramIndex++}`);
      updateValues.push(sessionData.pausedAt);
    }

    if (sessionData.resumedAt !== undefined) {
      updateFields.push(`resumed_at = $${paramIndex++}`);
      updateValues.push(sessionData.resumedAt);
    }

    if (sessionData.completedAt !== undefined) {
      updateFields.push(`completed_at = $${paramIndex++}`);
      updateValues.push(sessionData.completedAt);
    }

    if (sessionData.duration !== undefined) {
      updateFields.push(`duration = $${paramIndex++}`);
      updateValues.push(sessionData.duration);
    }

    if (sessionData.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      updateValues.push(JSON.stringify(sessionData.metadata));
    }

    updateValues.push(sessionId);

    const updateQuery = `
      UPDATE interview_sessions 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(updateQuery, updateValues);
    if (result.rows.length === 0) {
      throw new Error('Session not found');
    }

    return this.mapRowToSession(result.rows[0]);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete responses first
      await client.query('DELETE FROM session_responses WHERE session_id = $1', [sessionId]);
      
      // Delete session
      const result = await client.query('DELETE FROM interview_sessions WHERE id = $1', [sessionId]);
      
      if (result.rowCount === 0) {
        throw new Error('Session not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Response operations
  async createResponse(sessionId: string, responseData: SubmitResponseRequest): Promise<SessionResponse> {
    const responseId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO session_responses (
        id, session_id, question_id, text_response, audio_url, video_url,
        started_at, completed_at, duration, is_skipped, confidence, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      responseId,
      sessionId,
      responseData.questionId,
      responseData.textResponse || null,
      responseData.audioUrl || null,
      responseData.videoUrl || null,
      now,
      now,
      0, // Will be calculated based on actual timing
      false,
      responseData.metadata?.confidenceLevel || null,
      JSON.stringify(responseData.metadata || {}),
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToResponse(result.rows[0]);
  }

  async findResponsesBySessionId(sessionId: string): Promise<SessionResponse[]> {
    const query = `
      SELECT r.*, q.text as question_text, q.type as question_type
      FROM session_responses r
      LEFT JOIN questions q ON r.question_id = q.id
      WHERE r.session_id = $1
      ORDER BY r.started_at ASC
    `;
    const result = await this.pool.query(query, [sessionId]);
    
    return result.rows.map(row => this.mapRowToResponse(row));
  }

  async updateResponse(responseId: string, responseData: Partial<SessionResponse>): Promise<SessionResponse> {
    const query = `
      UPDATE session_responses 
      SET completed_at = COALESCE($2, completed_at),
          duration = COALESCE($3, duration),
          confidence = COALESCE($4, confidence),
          metadata = COALESCE($5, metadata)
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      responseId,
      responseData.completedAt,
      responseData.duration,
      responseData.confidence,
      responseData.metadata ? JSON.stringify(responseData.metadata) : null,
    ];

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Response not found');
    }

    return this.mapRowToResponse(result.rows[0]);
  }

  // Helper methods to map database rows to domain objects
  private mapRowToConfig(row: any): InterviewConfig {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      templateId: row.template_id,
      role: row.role,
      company: row.company,
      industry: row.industry,
      difficulty: row.difficulty as DifficultyLevel,
      duration: row.duration,
      questionTypes: JSON.parse(row.question_types || '[]'),
      focusAreas: JSON.parse(row.focus_areas || '[]'),
      aiPersonality: JSON.parse(row.ai_personality || '{}'),
      settings: JSON.parse(row.settings || '{}'),
      isTemplate: row.is_template || false,
      isPublic: row.is_public || false,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToTemplate(row: any): InterviewTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      role: row.role,
      industry: row.industry,
      difficulty: row.difficulty as DifficultyLevel,
      estimatedDuration: row.estimated_duration,
      questionCount: parseInt(row.question_count) || 0,
      questions: [], // Loaded separately if needed
      defaultSettings: JSON.parse(row.default_settings || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      isPublic: row.is_public,
      createdBy: row.created_by,
      usageCount: row.usage_count || 0,
      rating: parseFloat(row.avg_rating) || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToQuestion(row: any): Question {
    return {
      id: row.id,
      configId: row.config_id,
      templateId: row.template_id,
      type: row.type as QuestionType,
      category: row.category,
      difficulty: row.difficulty as DifficultyLevel,
      text: row.text,
      context: row.context,
      expectedAnswerStructure: row.expected_answer_structure,
      evaluationCriteria: JSON.parse(row.evaluation_criteria || '[]'),
      followUpQuestions: JSON.parse(row.follow_up_questions || '[]'),
      timeLimit: row.time_limit,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToSession(row: any): InterviewSession {
    return {
      id: row.id,
      userId: row.user_id,
      configId: row.config_id,
      config: {} as InterviewConfig, // Loaded separately
      state: row.state as SessionState,
      currentQuestionIndex: row.current_question_index || 0,
      questions: JSON.parse(row.questions || '[]'),
      responses: [], // Loaded separately
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      resumedAt: row.resumed_at,
      completedAt: row.completed_at,
      duration: row.duration || 0,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  private mapRowToResponse(row: any): SessionResponse {
    return {
      id: row.id,
      sessionId: row.session_id,
      questionId: row.question_id,
      question: {
        id: row.question_id,
        text: row.question_text,
        type: row.question_type,
      } as Question,
      textResponse: row.text_response,
      audioUrl: row.audio_url,
      videoUrl: row.video_url,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration || 0,
      isSkipped: row.is_skipped || false,
      confidence: row.confidence,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}