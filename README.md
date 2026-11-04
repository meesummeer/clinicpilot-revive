# ClinicPilot Revive

Clinic admin for Revive House of Dermatology & Healthcare, Karachi: Hub, Patients, Appointments, Expenses and Circle (membership).

React + Vite + Supabase, deployed to GitHub Pages by GitHub Actions on every push to `main`.

## Local development

```bash
npm install
cp .env.example .env   # add the Supabase publishable key
npm run dev
```

## Database

Run the files in `supabase/` in order in the Supabase SQL Editor. In Supabase Auth, keep "Allow new users to sign up" turned off.

## Staff access

Staff sign in with email and password. Add users and set passwords in Supabase under Authentication → Users. Every signed-in user can read and change all data.
