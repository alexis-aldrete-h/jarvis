-- Add priority field to gantt_projects table
ALTER TABLE gantt_projects 
ADD COLUMN IF NOT EXISTS priority TEXT;

-- Create index for better query performance when filtering by priority
CREATE INDEX IF NOT EXISTS idx_gantt_projects_priority ON gantt_projects(priority);

