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
