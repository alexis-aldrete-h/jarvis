-- Add actual_time_worked field to gantt_subtasks table (in minutes)
ALTER TABLE gantt_subtasks 
ADD COLUMN IF NOT EXISTS actual_time_worked NUMERIC DEFAULT 0;

-- Add actual_time_worked field to gantt_tasks table (in minutes)
ALTER TABLE gantt_tasks 
ADD COLUMN IF NOT EXISTS actual_time_worked NUMERIC DEFAULT 0;

