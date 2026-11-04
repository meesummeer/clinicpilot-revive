# ClinicPilot Revive

Clinic admin for Revive House of Dermatology & Healthcare, Karachi: Hub, Patients,
Appointments, Expenses, Circle (membership). Based on `meesummeer/clinicpilot-fdc-v2`
and `clinicpilot-ymdc`. Owned by Pluto (Meesum Mir), CyberHealth Solutions.

## Working style

- **Commit and push to `main` right after every change.** Pluto has asked for this
  standing: don't wait to be asked, and don't ask first.
- Run `npm run build` before pushing. Check the deploy with `gh run list`.
- Keep the theme: near-black backgrounds with the teal accent.

## Stack

- React 18 + Vite. Push to `main` deploys to GitHub Pages through
  `.github/workflows/deploy.yml`. The Supabase URL and publishable key live in
  the committed `.env.production`; both are public by design, and RLS is what protects
  the data. Never put a secret key there. Site: https://meesummeer.github.io/clinicpilot-revive/
- Supabase project `clinicpilot-revive`, ref `urwdtonvkibmeixzzmkj`, region `ap-northeast-1`.
  The key in use is the publishable key, never a secret key.
- `supabase/` holds the schema, in run order. There is no migration tool: new SQL
  goes in a new numbered file and is run in the Supabase SQL Editor.

## Invariants

- RLS allows signed-in users only. The `anon` role has no access to any table.
- "Allow new users to sign up" stays off in Supabase Auth, or anyone could create an
  account and pass RLS. Staff are added in Authentication -> Users.
- All staff have the same access for now (no roles).
- Read lists through `fetchAllRows()`: Supabase caps a response at 1000 rows.
- Show dates in Asia/Karachi through `src/lib/format.js`, never `toISOString().slice()`.
- Circle session counts are computed from `service_log`, never stored.
- `patients.mr_no` comes from a database sequence. `members.card_number` is issued by
  the app and protected by a unique index, with a retry on conflict.
- GitHub Pages has no SPA fallback, so the build copies `index.html` to `404.html`.

## Known gaps

- No Billing yet, so Hub shows no revenue or profit.
- Circle session counts don't reset on renewal.
- No automated backups.
