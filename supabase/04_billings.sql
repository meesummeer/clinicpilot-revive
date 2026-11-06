-- ClinicPilot Revive: billings. Run after 02_clinic.sql.
-- A billing entry may be linked to an existing patient or store a walk-in name/phone.

CREATE SEQUENCE billings_ref_seq START 10001;

CREATE TABLE billings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no       integer     NOT NULL UNIQUE DEFAULT nextval('billings_ref_seq'),
  patient_id   uuid        REFERENCES patients(id) ON DELETE SET NULL,
  patient_name text        NOT NULL,
  patient_phone text,
  patient_age  text,
  patient_gender text,
  -- line items stored as JSONB array: [{description, rate, qty, amount}]
  items        jsonb       NOT NULL DEFAULT '[]',
  subtotal     numeric(12,2) NOT NULL DEFAULT 0,
  grand_total  numeric(12,2) NOT NULL DEFAULT 0,
  payment_mode text        NOT NULL DEFAULT 'Cash',
  paid_amount  numeric(12,2) NOT NULL DEFAULT 0,
  balance_due  numeric(12,2) NOT NULL DEFAULT 0,
  notes        text,
  billing_date date        NOT NULL DEFAULT current_date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER SEQUENCE billings_ref_seq OWNED BY billings.ref_no;
CREATE INDEX billings_patient_id_idx ON billings (patient_id);
CREATE INDEX billings_billing_date_idx ON billings (billing_date);

ALTER TABLE billings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON billings FROM anon;
REVOKE ALL ON SEQUENCE billings_ref_seq FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON billings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE billings_ref_seq TO authenticated;

CREATE POLICY "staff full access" ON billings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
