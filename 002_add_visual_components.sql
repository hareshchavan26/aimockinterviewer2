-- Add visual_components column to performance_reports table
ALTER TABLE performance_reports 
ADD COLUMN IF NOT EXISTS visual_components JSONB NOT NULL DEFAULT '{}';

-- Add comment to document the column
COMMENT ON COLUMN performance_reports.visual_components IS 'JSON data containing visual report components including charts, heatmaps, and visualizations';