# Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**, paste all of `schema.sql`, and run it once.
3. Open **Authentication > URL Configuration** and add your local and production URLs.
4. Copy `.env.example` to `.env`.
5. Add the Project URL and public anon key from **Project Settings > API**.
6. Restart `npm run dev` after changing `.env`.

For immediate sign-up during development, disable email confirmation in **Authentication > Providers > Email**. For production, leave confirmation enabled and configure your Site URL and redirect URLs.

Never put the Supabase service-role key in this Vite project. The browser only needs the public anon key; Row Level Security and database functions protect game state.

## Upgrading an existing database

If you already ran an earlier version, run the latest `upgrade_card_categories.sql`, `upgrade_accounts_scores.sql`, and `upgrade_public_profile_pictures.sql` once in the SQL Editor. The category migration enables multi-category private rooms and automatic board sizing for the complete 80-card collection. The profile-picture migration makes avatar images publicly readable while keeping uploads owner-only. New installations only need the complete `schema.sql` file.

For per-mode Top 3 leaderboards, also run `upgrade_mode_leaderboards.sql` once. It records authenticated local results and all online room results; anonymous visitors can read the ranked Top 3 without direct table access.

Password recovery redirects back to the current app address. Add both your local URL (for example `http://localhost:5173`) and deployed production URL under **Authentication > URL Configuration > Redirect URLs**.

## Resend email delivery

The project uses Resend in two secure server-side integrations:

1. **Supabase custom SMTP** delivers confirmation and password-reset emails.
2. **`send-room-invite` Edge Function** delivers branded private-room invitations.

First verify your sending domain in Resend and create an API key. In Supabase, open **Authentication > Email > SMTP Settings** and use:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: your Resend API key
- Sender: an address on your verified domain, such as `hello@yourdomain.com`

Then install the Supabase CLI, link the project, and deploy the included function:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set \
  RESEND_API_KEY="re_your_key" \
  RESEND_FROM_EMAIL="Boricuir Memory <hello@yourdomain.com>" \
  GAME_URL="https://your-production-game-url.com"
npx supabase functions deploy send-room-invite
```

The branded confirmation template is included at `supabase/templates/confirm-signup.html`. Paste its complete contents into **Authentication > Email Templates > Confirm signup** and use `Confirm your Boricuir Memory account` as the subject.

For local Edge Function testing, create `supabase/functions/.env` (it is ignored by git) with the same three values, then run:

```bash
npx supabase start
npx supabase functions serve send-room-invite --env-file supabase/functions/.env
```

`RESEND_API_KEY` must never be added to the Vite `.env` file or prefixed with `VITE_`. The React app invokes the function using the signed-in player's Supabase session. The function verifies that the caller belongs to the waiting room before it sends an invitation.

The Edge Function intentionally uses the Supabase Auth and REST endpoints through native `fetch`. It has no npm imports, so deployment does not depend on `registry.npmjs.org` and avoids DNS-related bundling failures in Codespaces.

`supabase/functions/edge-runtime.d.ts` supplies the local TypeScript declarations for `Deno.env` and `Deno.serve`. This keeps VS Code free of `Cannot find name 'Deno'` errors without downloading external type packages.
