-- Add category field to gantt_projects table
ALTER TABLE gantt_projects 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for better query performance when filtering by category
CREATE INDEX IF NOT EXISTS idx_gantt_projects_category ON gantt_projects(category);

