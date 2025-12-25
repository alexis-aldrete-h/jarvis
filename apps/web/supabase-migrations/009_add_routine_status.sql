-- This migration ensures the database supports the 'routine' status value
-- The status column already exists from migration 005, but we add a check constraint
-- to document valid status values including 'routine'

-- Note: We don't add a CHECK constraint as it would be too restrictive
-- Instead, we just ensure the column can accept 'routine' as a value
-- The application layer handles status validation

-- Add a comment to document the routine status
COMMENT ON COLUMN gantt_projects.status IS 'Status values: backlog, sprint, today, active, completed, refinement, routine';
COMMENT ON COLUMN gantt_tasks.status IS 'Status values: backlog, sprint, today, active, completed, refinement, routine';
COMMENT ON COLUMN gantt_subtasks.status IS 'Status values: backlog, sprint, today, active, completed, refinement, routine';

