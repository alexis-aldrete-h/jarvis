-- Enable RLS on daily_notes table
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to read all daily notes
CREATE POLICY "Allow anonymous read access to daily_notes"
  ON daily_notes
  FOR SELECT
  TO anon
  USING (true);

-- Create policy to allow anonymous users to insert daily notes
CREATE POLICY "Allow anonymous insert access to daily_notes"
  ON daily_notes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy to allow anonymous users to update daily notes
CREATE POLICY "Allow anonymous update access to daily_notes"
  ON daily_notes
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create policy to allow anonymous users to delete daily notes
CREATE POLICY "Allow anonymous delete access to daily_notes"
  ON daily_notes
  FOR DELETE
  TO anon
  USING (true);

