-- Clear all dates for projects, tasks, and subtasks
-- This sets start_date and end_date to empty strings for all records
-- This will make all items show as "TO-DO" status (since status is calculated from dates)

-- Clear dates for all projects
UPDATE gantt_projects 
SET start_date = '', 
    end_date = '';

-- Clear dates for all tasks
UPDATE gantt_tasks 
SET start_date = '', 
    end_date = '';

-- Clear dates for all subtasks
UPDATE gantt_subtasks 
SET start_date = '', 
    end_date = '';

-- Note: Status is calculated dynamically from dates in the application
-- Empty dates will result in "TO-DO" status for all items

