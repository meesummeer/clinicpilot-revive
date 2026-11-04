# ClinicPilot Revive

Admin tools for Revive House of Dermatology & Healthcare, Karachi. Plain HTML pages using Supabase JS v2, hosted on GitHub Pages.

## Pages

- `circle.html`: Revive Circle membership admin (members, service tracking, analytics). `index.html` redirects here for now.

## Setup

1. In the Supabase SQL Editor, run `schema.sql`.
2. In `circle.html`, replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY`.
3. Push to `main`. GitHub Pages publishes from the repo root.

## Access

There is no login. The anon key is visible in the page source, so anyone who finds it can read and change member data. Add authentication and tighten the policies in `schema.sql` before relying on this for real member records.
