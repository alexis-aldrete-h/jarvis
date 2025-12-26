-- Create Transactions table
CREATE TABLE IF NOT EXISTS finance_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('food', 'transportation', 'entertainment', 'shopping', 'bills', 'healthcare', 'education', 'travel', 'other')),
  date TEXT NOT NULL,
  tags TEXT[], -- Array of strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Budgets table
CREATE TABLE IF NOT EXISTS finance_budgets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('food', 'transportation', 'entertainment', 'shopping', 'bills', 'healthcare', 'education', 'travel', 'other')),
  limit_amount NUMERIC NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Bank Accounts table
CREATE TABLE IF NOT EXISTS finance_bank_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit-card')),
  balance_mxn NUMERIC NOT NULL DEFAULT 0,
  balance_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Cash table
CREATE TABLE IF NOT EXISTS finance_cash (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pesos', 'dollars')),
  amount_mxn NUMERIC NOT NULL DEFAULT 0,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Investments table
CREATE TABLE IF NOT EXISTS finance_investments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('etf', 'stock', 'crypto', '401k', 'other')),
  quantity NUMERIC,
  price_per_share NUMERIC,
  value_mxn NUMERIC NOT NULL DEFAULT 0,
  value_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Debts table
CREATE TABLE IF NOT EXISTS finance_debts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('owed-to-me', 'i-owe')),
  amount_mxn NUMERIC NOT NULL DEFAULT 0,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Retirement Accounts table
CREATE TABLE IF NOT EXISTS finance_retirement_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('afore', 'infonavit', '401k', 'ira', 'other')),
  value_mxn NUMERIC NOT NULL DEFAULT 0,
  value_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category ON finance_transactions(category);

-- Create triggers to update updated_at automatically
CREATE TRIGGER update_finance_transactions_updated_at BEFORE UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_budgets_updated_at BEFORE UPDATE ON finance_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_bank_accounts_updated_at BEFORE UPDATE ON finance_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_cash_updated_at BEFORE UPDATE ON finance_cash
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_investments_updated_at BEFORE UPDATE ON finance_investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_debts_updated_at BEFORE UPDATE ON finance_debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finance_retirement_accounts_updated_at BEFORE UPDATE ON finance_retirement_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

