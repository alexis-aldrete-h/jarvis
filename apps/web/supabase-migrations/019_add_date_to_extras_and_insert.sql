-- Add date column to flight_training_extras table
ALTER TABLE flight_training_extras ADD COLUMN IF NOT EXISTS date TEXT;

-- Insert extras transactions
INSERT INTO flight_training_extras (id, concept, total_usd, total_mxn, date, created_at, updated_at)
VALUES
  ('extras-2025-04-23-1', 'Sending Application', 140.00, 2562.00, '2025-04-23', '2025-04-23'::timestamp, '2025-04-23'::timestamp),
  ('extras-2025-04-29-1', 'TSP Application', 24.00, 439.20, '2025-04-29', '2025-04-29'::timestamp, '2025-04-29'::timestamp),
  ('extras-2025-04-29-2', 'Staples Print', 1.25, 22.88, '2025-04-29', '2025-04-29'::timestamp, '2025-04-29'::timestamp),
  ('extras-2025-05-06-1', 'Huellas Digitales', 77.00, 1409.10, '2025-05-06', '2025-05-06'::timestamp, '2025-05-06'::timestamp),
  ('extras-2025-05-11-1', 'Medico', 185.00, 3385.50, '2025-05-11', '2025-05-11'::timestamp, '2025-05-11'::timestamp),
  ('extras-2025-05-29-1', 'Cosas Tienda (Bose, Libros, Log book)', 1636.40, 29946.12, '2025-05-29', '2025-05-29'::timestamp, '2025-05-29'::timestamp),
  ('extras-2025-05-30-1', 'Sportys Ground School', 399.00, 7301.70, '2025-05-30', '2025-05-30'::timestamp, '2025-05-30'::timestamp),
  ('extras-2025-06-06-1', 'Plus One Registration', 181.50, 3321.45, '2025-06-06', '2025-06-06'::timestamp, '2025-06-06'::timestamp),
  ('extras-2025-06-06-2', 'Plotter', 26.88, 491.90, '2025-06-06', '2025-06-06'::timestamp, '2025-06-06'::timestamp),
  ('extras-2025-06-12-1', 'Pilot Supplies (Popote, checklists, librito)', 40.78, 746.27, '2025-06-12', '2025-06-12'::timestamp, '2025-06-12'::timestamp),
  ('extras-2025-06-13-1', 'Gym bag y ipadcristal', 44.04, 805.93, '2025-06-13', '2025-06-13'::timestamp, '2025-06-13'::timestamp),
  ('extras-2025-06-15-1', 'Ipad Cristal 2', 12.82, 234.61, '2025-06-15', '2025-06-15'::timestamp, '2025-06-15'::timestamp),
  ('extras-2025-06-15-2', 'IFR book, ipad cov and hold, knee, pilot bag', 176.84, 3236.17, '2025-06-15', '2025-06-15'::timestamp, '2025-06-15'::timestamp),
  ('extras-2025-06-23-1', 'Ipad Mini', 680.67, 12456.26, '2025-06-23', '2025-06-23'::timestamp, '2025-06-23'::timestamp),
  ('extras-2025-06-25-1', 'Headlamp', 15.06, 275.60, '2025-06-25', '2025-06-25'::timestamp, '2025-06-25'::timestamp),
  ('extras-2025-06-26-1', 'Ipad Case', 71.93, 1316.32, '2025-06-26', '2025-06-26'::timestamp, '2025-06-26'::timestamp),
  ('extras-2025-06-30-1', 'IDP Fund Junio (TODOS)', 44.48, 813.98, '2025-06-30', '2025-06-30'::timestamp, '2025-06-30'::timestamp),
  ('extras-2025-07-01-1', 'Plus One Monthly (July)', 37.50, 686.25, '2025-07-01', '2025-07-01'::timestamp, '2025-07-01'::timestamp),
  ('extras-2025-07-07-1', 'Foreflight', 369.99, 6770.82, '2025-07-07', '2025-07-07'::timestamp, '2025-07-07'::timestamp),
  ('extras-2025-08-01-1', 'Monthly Plus One (August)', 37.50, 686.25, '2025-08-01', '2025-08-01'::timestamp, '2025-08-01'::timestamp),
  ('extras-2025-08-01-2', 'UNKNOWN PLUS ONE', 21.54, 394.18, '2025-08-01', '2025-08-01'::timestamp, '2025-08-01'::timestamp),
  ('extras-2025-09-01-1', 'Monthly Plus One (September)', 37.50, 686.25, '2025-09-01', '2025-09-01'::timestamp, '2025-09-01'::timestamp),
  ('extras-2025-09-25-1', 'Sim equipo (pedales, throttle y yolk)', 688.50, 12589.55, '2025-09-25', '2025-09-25'::timestamp, '2025-09-25'::timestamp),
  ('extras-2025-09-25-2', 'X-plane Simulador Software', 59.99, 1097.82, '2025-09-25', '2025-09-25'::timestamp, '2025-09-25'::timestamp),
  ('extras-2025-10-01-1', 'Monthly Plus One (October)', 37.50, 686.25, '2025-10-01', '2025-10-01'::timestamp, '2025-10-01'::timestamp),
  ('extras-2025-10-01-2', 'EB6', 28.88, 528.50, '2025-10-01', '2025-10-01'::timestamp, '2025-10-01'::timestamp),
  ('extras-2025-11-01-1', 'Monthly Plus One (November)', 37.50, 686.25, '2025-11-01', '2025-11-01'::timestamp, '2025-11-01'::timestamp),
  ('extras-2025-11-23-1', 'Libro - Radio Calls Kindle', 19.95, 365.09, '2025-11-23', '2025-11-23'::timestamp, '2025-11-23'::timestamp),
  ('extras-2025-12-01-1', 'Monthly Plus One (December)', 37.50, 686.25, '2025-12-01', '2025-12-01'::timestamp, '2025-12-01'::timestamp),
  ('extras-2025-12-01-2', 'Libros y Checklist', 74.24, 1358.59, '2025-12-01', '2025-12-01'::timestamp, '2025-12-01'::timestamp),
  ('extras-2025-12-08-1', 'VSL Aviation - Guia de estudio ACS', 70.00, 1281.00, '2025-12-08', '2025-12-08'::timestamp, '2025-12-08'::timestamp);
