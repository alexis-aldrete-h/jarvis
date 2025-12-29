-- Add pomodoros_completed field to gantt_subtasks table
ALTER TABLE gantt_subtasks 
ADD COLUMN IF NOT EXISTS pomodoros_completed INTEGER DEFAULT 0;

-- Add pomodoros_completed field to gantt_tasks table (for future use)
ALTER TABLE gantt_tasks 
ADD COLUMN IF NOT EXISTS pomodoros_completed INTEGER DEFAULT 0;

