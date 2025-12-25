-- Add order field to gantt_projects table
ALTER TABLE gantt_projects 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Add order field to gantt_tasks table
ALTER TABLE gantt_tasks 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Add order field to gantt_subtasks table
ALTER TABLE gantt_subtasks 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Create indexes for better query performance when ordering
CREATE INDEX IF NOT EXISTS idx_gantt_projects_order ON gantt_projects("order");
CREATE INDEX IF NOT EXISTS idx_gantt_tasks_order ON gantt_tasks(project_id, "order");
CREATE INDEX IF NOT EXISTS idx_gantt_subtasks_order ON gantt_subtasks(task_id, "order");

-- Update existing records to have order based on created_at
-- This ensures existing data has a valid order
UPDATE gantt_projects 
SET "order" = sub.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM gantt_projects
) sub
WHERE gantt_projects.id = sub.id;

UPDATE gantt_tasks 
SET "order" = sub.row_num - 1
FROM (
  SELECT id, project_id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as row_num
  FROM gantt_tasks
) sub
WHERE gantt_tasks.id = sub.id;

UPDATE gantt_subtasks 
SET "order" = sub.row_num - 1
FROM (
  SELECT id, task_id, ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY created_at) as row_num
  FROM gantt_subtasks
) sub
WHERE gantt_subtasks.id = sub.id;


