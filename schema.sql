-- Interview Configuration Service Database Schema

-- Interview Configurations Table
CREATE TABLE IF NOT EXISTS interview_configs (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_id UUID,
    role VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    industry VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('entry', 'junior', 'mid', 'senior', 'principal', 'executive')),
    duration INTEGER NOT NULL CHECK (duration >= 5 AND duration <= 180),
    question_types JSONB NOT NULL,
    focus_areas JSONB NOT NULL,
    ai_personality JSONB NOT NULL,
    settings JSONB NOT NULL,
    is_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview Templates Table
CREATE TABLE IF NOT EXISTS interview_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    role VARCHAR(100) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('entry', 'junior', 'mid', 'senior', 'principal', 'executive')),
    estimated_duration INTEGER NOT NULL,
    default_settings JSONB NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table (for custom configurations)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY,
    config_id UUID REFERENCES interview_configs(id) ON DELETE CASCADE,
    template_id UUID,
    type VARCHAR(30) NOT NULL CHECK (type IN ('behavioral', 'technical', 'situational', 'case_study', 'coding', 'system_design', 'culture_fit', 'leadership', 'problem_solving')),
    category VARCHAR(30) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('entry', 'junior', 'mid', 'senior', 'principal', 'executive')),
    text TEXT NOT NULL,
    context TEXT,
    expected_answer_structure VARCHAR(20),
    evaluation_criteria JSONB DEFAULT '[]'::jsonb,
    follow_up_questions JSONB DEFAULT '[]'::jsonb,
    time_limit INTEGER,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template Questions Table (for template questions)
CREATE TABLE IF NOT EXISTS template_questions (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES interview_templates(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('behavioral', 'technical', 'situational', 'case_study', 'coding', 'system_design', 'culture_fit', 'leadership', 'problem_solving')),
    category VARCHAR(30) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('entry', 'junior', 'mid', 'senior', 'principal', 'executive')),
    text TEXT NOT NULL,
    context TEXT,
    expected_answer_structure VARCHAR(20),
    evaluation_criteria JSONB DEFAULT '[]'::jsonb,
    follow_up_questions JSONB DEFAULT '[]'::jsonb,
    time_limit INTEGER,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview Sessions Table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    config_id UUID REFERENCES interview_configs(id) ON DELETE CASCADE,
    state VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (state IN ('created', 'in_progress', 'paused', 'completed', 'abandoned', 'error')),
    current_question_index INTEGER DEFAULT 0,
    questions JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paused_at TIMESTAMP WITH TIME ZONE,
    resumed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER DEFAULT 0, -- in seconds
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Session Responses Table
CREATE TABLE IF NOT EXISTS session_responses (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    text_response TEXT,
    audio_url VARCHAR(500),
    video_url VARCHAR(500),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER DEFAULT 0, -- in seconds
    is_skipped BOOLEAN DEFAULT FALSE,
    confidence DECIMAL(3,2),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_configs_user_id ON interview_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_configs_template_id ON interview_configs(template_id);
CREATE INDEX IF NOT EXISTS idx_interview_configs_role ON interview_configs(role);
CREATE INDEX IF NOT EXISTS idx_interview_configs_industry ON interview_configs(industry);
CREATE INDEX IF NOT EXISTS idx_interview_configs_difficulty ON interview_configs(difficulty);
CREATE INDEX IF NOT EXISTS idx_interview_configs_created_at ON interview_configs(created_at);

CREATE INDEX IF NOT EXISTS idx_interview_templates_role ON interview_templates(role);
CREATE INDEX IF NOT EXISTS idx_interview_templates_industry ON interview_templates(industry);
CREATE INDEX IF NOT EXISTS idx_interview_templates_difficulty ON interview_templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_interview_templates_is_public ON interview_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_interview_templates_usage_count ON interview_templates(usage_count);
CREATE INDEX IF NOT EXISTS idx_interview_templates_rating ON interview_templates(rating);

CREATE INDEX IF NOT EXISTS idx_questions_config_id ON questions(config_id);
CREATE INDEX IF NOT EXISTS idx_questions_template_id ON questions(template_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

CREATE INDEX IF NOT EXISTS idx_template_questions_template_id ON template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_type ON template_questions(type);
CREATE INDEX IF NOT EXISTS idx_template_questions_difficulty ON template_questions(difficulty);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_config_id ON interview_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_state ON interview_sessions(state);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_started_at ON interview_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_session_responses_session_id ON session_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_session_responses_question_id ON session_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_session_responses_started_at ON session_responses(started_at);

-- Full-text search indexes for templates
CREATE INDEX IF NOT EXISTS idx_interview_templates_search ON interview_templates USING gin(to_tsvector('english', name || ' ' || description || ' ' || role || ' ' || industry));

-- JSONB indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_configs_question_types ON interview_configs USING gin(question_types);
CREATE INDEX IF NOT EXISTS idx_interview_configs_focus_areas ON interview_configs USING gin(focus_areas);
CREATE INDEX IF NOT EXISTS idx_interview_configs_tags ON interview_configs USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_interview_templates_tags ON interview_templates USING gin(tags);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interview_configs_updated_at BEFORE UPDATE ON interview_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interview_templates_updated_at BEFORE UPDATE ON interview_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_questions_updated_at BEFORE UPDATE ON template_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();