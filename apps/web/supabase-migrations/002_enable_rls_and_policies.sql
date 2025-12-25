-- Enable Row Level Security on all tables
ALTER TABLE gantt_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_subtasks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous users (anon key) to read/write all data
-- This allows your app to work with the anon key without authentication

-- Policies for gantt_projects
CREATE POLICY "Allow anonymous read access to gantt_projects"
  ON gantt_projects
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to gantt_projects"
  ON gantt_projects
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to gantt_projects"
  ON gantt_projects
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to gantt_projects"
  ON gantt_projects
  FOR DELETE
  TO anon
  USING (true);

-- Policies for gantt_tasks
CREATE POLICY "Allow anonymous read access to gantt_tasks"
  ON gantt_tasks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to gantt_tasks"
  ON gantt_tasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to gantt_tasks"
  ON gantt_tasks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to gantt_tasks"
  ON gantt_tasks
  FOR DELETE
  TO anon
  USING (true);

-- Policies for gantt_subtasks
CREATE POLICY "Allow anonymous read access to gantt_subtasks"
  ON gantt_subtasks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to gantt_subtasks"
  ON gantt_subtasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to gantt_subtasks"
  ON gantt_subtasks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to gantt_subtasks"
  ON gantt_subtasks
  FOR DELETE
  TO anon
  USING (true);



