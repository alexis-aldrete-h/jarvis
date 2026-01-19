-- Enable Row Level Security
ALTER TABLE net_worth_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own net worth history
CREATE POLICY "Users can view their own net worth history"
  ON net_worth_history
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own net worth history
CREATE POLICY "Users can insert their own net worth history"
  ON net_worth_history
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own net worth history
CREATE POLICY "Users can update their own net worth history"
  ON net_worth_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own net worth history
CREATE POLICY "Users can delete their own net worth history"
  ON net_worth_history
  FOR DELETE
  USING (true);
