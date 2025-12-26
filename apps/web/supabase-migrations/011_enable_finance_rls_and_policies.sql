-- Enable Row Level Security on all finance tables
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_retirement_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for finance_transactions
CREATE POLICY "Allow anonymous read access to finance_transactions"
  ON finance_transactions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to finance_transactions"
  ON finance_transactions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to finance_transactions"
  ON finance_transactions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to finance_transactions"
  ON finance_transactions
  FOR DELETE
  TO anon
  USING (true);

-- Policies for finance_budgets
CREATE POLICY "Allow anonymous read access to finance_budgets"
  ON finance_budgets
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to finance_budgets"
  ON finance_budgets
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to finance_budgets"
  ON finance_budgets
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to finance_budgets"
  ON finance_budgets
  FOR DELETE
  TO anon
  USING (true);

-- Policies for finance_bank_accounts
CREATE POLICY "Allow anonymous read access to finance_bank_accounts"
  ON finance_bank_accounts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to finance_bank_accounts"
  ON finance_bank_accounts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to finance_bank_accounts"
  ON finance_bank_accounts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to finance_bank_accounts"
  ON finance_bank_accounts
  FOR DELETE
  TO anon
  USING (true);

-- Policies for finance_cash
CREATE POLICY "Allow anonymous read access to finance_cash"
  ON finance_cash
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to finance_cash"
  ON finance_cash
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to finance_cash"
  ON finance_cash
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to finance_cash"
  ON finance_cash
  FOR DELETE
  TO anon
  USING (true);

-- Policies for finance_investments
CREATE POLICY "Allow anonymous read access to finance_investments"
  ON finance_investments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to finance_investments"
  ON finance_investments
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to finance_investments"
  ON finance_investments
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to finance_investments"
  ON finance_investments
  FOR DELETE
  TO anon
  USING (true);

-- Policies for finance_debts
CREATE POLICY "Allow anonymous read access to finance_debts"
  ON finance_debts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to finance_debts"
  ON finance_debts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to finance_debts"
  ON finance_debts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to finance_debts"
  ON finance_debts
  FOR DELETE
  TO anon
  USING (true);

-- Policies for finance_retirement_accounts
CREATE POLICY "Allow anonymous read access to finance_retirement_accounts"
  ON finance_retirement_accounts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to finance_retirement_accounts"
  ON finance_retirement_accounts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to finance_retirement_accounts"
  ON finance_retirement_accounts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to finance_retirement_accounts"
  ON finance_retirement_accounts
  FOR DELETE
  TO anon
  USING (true);

