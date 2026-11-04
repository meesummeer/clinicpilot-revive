-- Vendor Tracker
-- Run this in the Supabase SQL Editor for the clinicpilot-revive project.

CREATE TABLE IF NOT EXISTS vendors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  invoice_id text,
  bill_date  date NOT NULL,
  items      text NOT NULL,
  amount     numeric NOT NULL DEFAULT 0,
  status     text NOT NULL DEFAULT 'UNPAID'
               CHECK (status IN ('PAID', 'UNPAID', 'DUE_THIS_MONTH', 'DISPUTED')),
  notes      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users full access" ON vendors
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "auth users full access" ON vendor_bills
  FOR ALL USING (auth.role() = 'authenticated');
