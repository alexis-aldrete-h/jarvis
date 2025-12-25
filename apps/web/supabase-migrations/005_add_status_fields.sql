-- Add status field to gantt_projects table
ALTER TABLE gantt_projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'backlog';

-- Add status field to gantt_tasks table
ALTER TABLE gantt_tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'backlog';

-- Add status field to gantt_subtasks table
ALTER TABLE gantt_subtasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'backlog';

-- Create indexes for better query performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_gantt_projects_status ON gantt_projects(status);
CREATE INDEX IF NOT EXISTS idx_gantt_tasks_status ON gantt_tasks(status);
CREATE INDEX IF NOT EXISTS idx_gantt_subtasks_status ON gantt_subtasks(status);


