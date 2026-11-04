-- ClinicPilot Revive, Circle page: run once in Supabase → SQL Editor.

CREATE TABLE members (
  id text PRIMARY KEY,
  name text,
  phone text,
  email text,
  plan text DEFAULT '6month', -- '6month' or 'annual'
  start_date text,
  end_date text,
  card_number text, -- e.g. RC-001
  status text DEFAULT 'active', -- active / expired / paused
  notes text,
  created_at text
);

CREATE TABLE service_log (
  id text PRIMARY KEY,
  member_id text REFERENCES members(id) ON DELETE CASCADE, -- deleting a member removes their log
  service text,
  date text,
  notes text,
  logged_by text
);

-- Stops two staff adding a member at once from getting the same card number.
CREATE UNIQUE INDEX members_card_number_key ON members (card_number);
CREATE INDEX service_log_member_id_idx ON service_log (member_id);

-- Row Level Security, with open access for the anon key while there is no login.
-- IMPORTANT: this means anyone who has the anon key can read and change all data,
-- and the key is visible in the page source. Replace these policies with
-- authenticated-only ones when a login is added.
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON members, service_log TO anon;

CREATE POLICY "anon full access" ON members
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access" ON service_log
  FOR ALL TO anon USING (true) WITH CHECK (true);
