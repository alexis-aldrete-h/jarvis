-- Create Net Worth History table
CREATE TABLE IF NOT EXISTS net_worth_history (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_savings_usd NUMERIC NOT NULL DEFAULT 0,
  total_savings_mxn NUMERIC NOT NULL DEFAULT 0,
  total_investments_usd NUMERIC NOT NULL DEFAULT 0,
  total_investments_mxn NUMERIC NOT NULL DEFAULT 0,
  total_debt_usd NUMERIC NOT NULL DEFAULT 0,
  total_debt_mxn NUMERIC NOT NULL DEFAULT 0,
  net_debt_usd NUMERIC NOT NULL DEFAULT 0,
  net_debt_mxn NUMERIC NOT NULL DEFAULT 0,
  flight_training_usd NUMERIC NOT NULL DEFAULT 0,
  flight_training_mxn NUMERIC NOT NULL DEFAULT 0,
  total_retirement_usd NUMERIC NOT NULL DEFAULT 0,
  total_retirement_mxn NUMERIC NOT NULL DEFAULT 0,
  total_net_worth_usd NUMERIC NOT NULL DEFAULT 0,
  total_net_worth_mxn NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_net_worth_history_date ON net_worth_history(date);

-- Create trigger to update updated_at automatically
CREATE TRIGGER update_net_worth_history_updated_at BEFORE UPDATE ON net_worth_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
