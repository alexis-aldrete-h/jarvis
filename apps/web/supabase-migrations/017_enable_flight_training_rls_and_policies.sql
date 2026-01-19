-- Enable Row Level Security on all flight training tables
ALTER TABLE flight_training_cfi ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_training_plane_rental ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_training_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_training_income ENABLE ROW LEVEL SECURITY;

-- Policies for flight_training_cfi
CREATE POLICY "Allow anonymous read access to flight_training_cfi"
  ON flight_training_cfi
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to flight_training_cfi"
  ON flight_training_cfi
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to flight_training_cfi"
  ON flight_training_cfi
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to flight_training_cfi"
  ON flight_training_cfi
  FOR DELETE
  TO anon
  USING (true);

-- Policies for flight_training_plane_rental
CREATE POLICY "Allow anonymous read access to flight_training_plane_rental"
  ON flight_training_plane_rental
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to flight_training_plane_rental"
  ON flight_training_plane_rental
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to flight_training_plane_rental"
  ON flight_training_plane_rental
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to flight_training_plane_rental"
  ON flight_training_plane_rental
  FOR DELETE
  TO anon
  USING (true);

-- Policies for flight_training_extras
CREATE POLICY "Allow anonymous read access to flight_training_extras"
  ON flight_training_extras
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to flight_training_extras"
  ON flight_training_extras
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to flight_training_extras"
  ON flight_training_extras
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to flight_training_extras"
  ON flight_training_extras
  FOR DELETE
  TO anon
  USING (true);

-- Policies for flight_training_income
CREATE POLICY "Allow anonymous read access to flight_training_income"
  ON flight_training_income
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to flight_training_income"
  ON flight_training_income
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to flight_training_income"
  ON flight_training_income
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to flight_training_income"
  ON flight_training_income
  FOR DELETE
  TO anon
  USING (true);
