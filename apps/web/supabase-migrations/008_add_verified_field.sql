-- Add verified field to gantt_projects, gantt_tasks, and gantt_subtasks tables
ALTER TABLE gantt_projects 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

ALTER TABLE gantt_tasks 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

ALTER TABLE gantt_subtasks 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance when filtering by verified status
CREATE INDEX IF NOT EXISTS idx_gantt_projects_verified ON gantt_projects(verified);
CREATE INDEX IF NOT EXISTS idx_gantt_tasks_verified ON gantt_tasks(verified);
CREATE INDEX IF NOT EXISTS idx_gantt_subtasks_verified ON gantt_subtasks(verified);

