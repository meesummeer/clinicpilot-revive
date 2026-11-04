-- ClinicPilot Revive: patients, appointments, expenses. Run after 01_circle.sql.
-- Same rule as Circle: signed-in staff only. The public key alone gets nothing.

CREATE SEQUENCE patients_mr_no_seq START 1;

CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mr_no integer NOT NULL UNIQUE DEFAULT nextval('patients_mr_no_seq'),
  name text NOT NULL,
  phone text,
  address text,
  gender text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER SEQUENCE patients_mr_no_seq OWNED BY patients.mr_no;

CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure text,
  doctor text,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'fulfilled', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX appointments_patient_id_idx ON appointments (patient_id);
CREATE INDEX appointments_scheduled_at_idx ON appointments (scheduled_at);

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'salary', 'utility', 'miscellaneous', 'doctors_share', 'lab', 'material')),
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  expense_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX expenses_expense_date_idx ON expenses (expense_date);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON patients, appointments, expenses FROM anon;
REVOKE ALL ON SEQUENCE patients_mr_no_seq FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON patients, appointments, expenses TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE patients_mr_no_seq TO authenticated;

CREATE POLICY "staff full access" ON patients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff full access" ON appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff full access" ON expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
