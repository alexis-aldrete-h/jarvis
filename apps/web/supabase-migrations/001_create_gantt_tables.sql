-- Create Gantt Projects table
CREATE TABLE IF NOT EXISTS gantt_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Gantt Tasks table
CREATE TABLE IF NOT EXISTS gantt_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES gantt_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  color TEXT,
  priority TEXT,
  category TEXT,
  total_points NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Gantt Subtasks table
CREATE TABLE IF NOT EXISTS gantt_subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES gantt_tasks(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES gantt_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  color TEXT,
  priority TEXT,
  category TEXT,
  story_points NUMERIC,
  difficulty NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gantt_tasks_project_id ON gantt_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_gantt_subtasks_task_id ON gantt_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_gantt_subtasks_project_id ON gantt_subtasks(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to update updated_at automatically
CREATE TRIGGER update_gantt_projects_updated_at BEFORE UPDATE ON gantt_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gantt_tasks_updated_at BEFORE UPDATE ON gantt_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gantt_subtasks_updated_at BEFORE UPDATE ON gantt_subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




