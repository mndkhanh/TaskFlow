How to set up local and deploy your own one with this repo:

1. Fork github repo

2. Set up supabase

- run all the db init, functions, rls, triggers..
- with auth enable email/pwd

3. Clouflare deploy react

- REmmeber to setup enviroment VITE\_ prefix env var

4. To run local for two site:

- set up .env llike the .env.example

5. To grant access for an admin with email, insert into the table admins with appropriate data and run local

- sample script:
  -- Seed the initial admin (the developer). Idempotent — no-op if the user has
  -- not signed up yet or is already an admin.
  insert into public.admins (user_id)
  select id from auth.users where email = 'YOUR_EXPECTED_ADMIN_EMAIL'
  on conflict (user_id) do nothing;

You can reach out to see my demo at:

- link youtube:
- link deployment: https://srttaskflow.pages.dev/
