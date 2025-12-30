-- Performance Reports Table
CREATE TABLE IF NOT EXISTS performance_reports (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    overall_score DECIMAL(5,4) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    strengths JSONB NOT NULL DEFAULT '[]',
    weaknesses JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category Scores Table
CREATE TABLE IF NOT EXISTS report_category_scores (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL REFERENCES performance_reports(id) ON DELETE CASCADE,
    communication DECIMAL(5,4) NOT NULL CHECK (communication >= 0 AND communication <= 1),
    technical_accuracy DECIMAL(5,4) NOT NULL CHECK (technical_accuracy >= 0 AND technical_accuracy <= 1),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    clarity DECIMAL(5,4) NOT NULL CHECK (clarity >= 0 AND clarity <= 1),
    structure DECIMAL(5,4) NOT NULL CHECK (structure >= 0 AND structure <= 1),
    relevance DECIMAL(5,4) NOT NULL CHECK (relevance >= 0 AND relevance <= 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Improvement Plans Table
CREATE TABLE IF NOT EXISTS report_improvement_plans (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL REFERENCES performance_reports(id) ON DELETE CASCADE,
    priority_areas JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    practice_exercises JSONB NOT NULL DEFAULT '[]',
    estimated_time_to_improve INTEGER NOT NULL CHECK (estimated_time_to_improve > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Benchmark Comparisons Table
CREATE TABLE IF NOT EXISTS report_benchmark_comparisons (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL REFERENCES performance_reports(id) ON DELETE CASCADE,
    percentile INTEGER NOT NULL CHECK (percentile >= 0 AND percentile <= 100),
    average_score DECIMAL(5,4) NOT NULL CHECK (average_score >= 0 AND average_score <= 1),
    top_performer_score DECIMAL(5,4) NOT NULL CHECK (top_performer_score >= 0 AND top_performer_score <= 1),
    industry_average DECIMAL(5,4) NOT NULL CHECK (industry_average >= 0 AND industry_average <= 1),
    role_average DECIMAL(5,4) NOT NULL CHECK (role_average >= 0 AND role_average <= 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Transcripts Table
CREATE TABLE IF NOT EXISTS report_transcripts (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL REFERENCES performance_reports(id) ON DELETE CASCADE,
    segments JSONB NOT NULL DEFAULT '[]',
    highlights JSONB NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_reports_user_id ON performance_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_reports_session_id ON performance_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_reports_created_at ON performance_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_report_category_scores_report_id ON report_category_scores(report_id);
CREATE INDEX IF NOT EXISTS idx_report_improvement_plans_report_id ON report_improvement_plans(report_id);
CREATE INDEX IF NOT EXISTS idx_report_benchmark_comparisons_report_id ON report_benchmark_comparisons(report_id);
CREATE INDEX IF NOT EXISTS idx_report_transcripts_report_id ON report_transcripts(report_id);

-- Unique constraint to prevent duplicate reports for the same session
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_reports_session_unique ON performance_reports(session_id);

-- Add updated_at trigger for performance_reports
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_performance_reports_updated_at 
    BEFORE UPDATE ON performance_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();