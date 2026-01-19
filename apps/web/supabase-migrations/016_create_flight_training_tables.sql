-- Create CFI Transactions table
CREATE TABLE IF NOT EXISTS flight_training_cfi (
  id TEXT PRIMARY KEY,
  concept TEXT NOT NULL CHECK (concept IN ('Flight', 'Ground')),
  rate_per_hour NUMERIC NOT NULL,
  hours NUMERIC NOT NULL,
  total_usd NUMERIC NOT NULL,
  total_mxn NUMERIC NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Plane Rental Transactions table
CREATE TABLE IF NOT EXISTS flight_training_plane_rental (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL,
  concept TEXT NOT NULL,
  total_usd NUMERIC NOT NULL,
  total_mxn NUMERIC NOT NULL,
  hours NUMERIC NOT NULL,
  idp NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Extras Transactions table
CREATE TABLE IF NOT EXISTS flight_training_extras (
  id TEXT PRIMARY KEY,
  concept TEXT NOT NULL,
  total_usd NUMERIC NOT NULL,
  total_mxn NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Income Transactions table
CREATE TABLE IF NOT EXISTS flight_training_income (
  id TEXT PRIMARY KEY,
  concept TEXT NOT NULL,
  total_usd NUMERIC NOT NULL,
  total_mxn NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_flight_training_cfi_date ON flight_training_cfi(date);
CREATE INDEX IF NOT EXISTS idx_flight_training_cfi_concept ON flight_training_cfi(concept);

-- Create triggers to update updated_at automatically
CREATE TRIGGER update_flight_training_cfi_updated_at BEFORE UPDATE ON flight_training_cfi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_training_plane_rental_updated_at BEFORE UPDATE ON flight_training_plane_rental
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_training_extras_updated_at BEFORE UPDATE ON flight_training_extras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_training_income_updated_at BEFORE UPDATE ON flight_training_income
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
