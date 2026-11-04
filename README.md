# ClinicPilot Revive

Admin tools for Revive House of Dermatology & Healthcare, Karachi. Plain HTML pages using Supabase JS v2, hosted on GitHub Pages.

## Pages

- `circle.html`: Revive Circle membership admin (members, service tracking, analytics). `index.html` redirects here for now.

## Setup

1. In the Supabase SQL Editor, run `schema.sql`.
2. In `circle.html`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the publishable key, never a secret key).
3. In Supabase Auth, turn off "Allow new users to sign up".
4. Push to `main`. GitHub Pages publishes from the repo root.

## Staff access

Staff sign in with email and password. There is no self sign-up or password reset in the app: add users and set passwords in Supabase under Authentication → Users. Every signed-in user can read and change all Circle data.
