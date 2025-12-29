-- Create daily_notes table
CREATE TABLE IF NOT EXISTS daily_notes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes(date);

-- Create trigger to update updated_at automatically
CREATE TRIGGER update_daily_notes_updated_at BEFORE UPDATE ON daily_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

