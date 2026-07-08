# TaskFlow

A multi-user Kanban workspace app (Trello-style) built on **React 19 + Vite + TailwindCSS v4**
and **Supabase** (Postgres, Auth, Storage, Realtime). Workspaces contain boards, boards contain
lists, and lists contain cards with labels, assignees, due dates, checklists, comments, and
attachments. Access is governed by workspace-level RBAC (owner / member / viewer) enforced with
Postgres Row Level Security.

The repo holds two independent front-ends (no root `package.json` — each is installed and run on
its own) plus the database schema:

- `www/taskflow` — the main app (auth, workspaces, boards, drag-and-drop cards, invitations, inbox, realtime).
- `www/admin-dashboard` — an admin-gated console with instance-wide stats and activity.
- `supabase/db` — the canonical hand-maintained SQL schema.

## How to set up locally and deploy your own copy

### 1. Fork the GitHub repo

Fork it to your account and clone your fork.

### 2. Set up Supabase

#### 2.1 Create a Supabase project, then in the **SQL Editor** apply the files in `supabase/db/` in order:

1. `initial_schema.sql` — tables
2. `functions_triggers.sql` — signup provisioning + `updated_at` triggers
3. `rls_policies.sql` — workspace RBAC row-level security
4. `harden_functions.sql` — hardening, storage buckets, activity feed, and the invitation layer
5. `admin_script.sql` — the admin-dashboard backend (admins table + `admin_dashboard()` RPC)

Under **Authentication → Providers**, enable **Email/Password** (Google OAuth is optional).

#### 2.2 Set up the invite-email edge function _(optional)_

Workspace invitations always work without this step — an invite is queued in the database and the
recipient accepts it in-app. This edge function just adds a courtesy **notification email** on top,
sent in the background (the invite flow never blocks or fails on it). Set it up if you want invitees
emailed; skip it otherwise.

The `send-invite-email` edge function (`supabase/functions/send-invite-email`) delivers the mail over
Gmail SMTP. Configure it with the [Supabase CLI](https://supabase.com/docs/guides/cli):

1. **Create a Gmail App Password.** On the sending Google account, enable 2-Step Verification, then
   generate an App Password (Google Account → Security → App passwords). This 16-character value is
   used instead of the account password. **Never commit it** — it lives only in Supabase secrets.

2. **Set the function secrets** (replace the placeholders with your values and project ref):

   ```bash
   supabase secrets set \
     GMAIL_USER=your-gmail@gmail.com \
     GMAIL_APP_PASSWORD=your16charapppass \
     --project-ref <your-project-ref>
   ```

3. **Deploy the function** (keep JWT verification on — the app passes the signed-in user's token):

   ```bash
   supabase functions deploy send-invite-email --project-ref <your-project-ref>
   ```

The app invokes it in the background after an owner invites someone; the function re-verifies (via the
caller's token) that they own the workspace before sending, so it can't be used as an open relay. If
the email can't be delivered the invitation is still queued for the recipient to accept in-app.

### 3. Deploy the React apps to Cloudflare Pages

Create a Cloudflare Pages project for each app (they deploy separately):

| Setting          | `www/taskflow`  | `www/admin-dashboard` |
| ---------------- | --------------- | --------------------- |
| Root directory   | `www/taskflow`  | `www/admin-dashboard` |
| Build command    | `npm run build` | `npm run build`       |
| Output directory | `dist`          | `dist`                |

In each project's settings, add the environment variables (note the **`VITE_` prefix** — Vite only
exposes vars with it):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Run locally

Create a `.env` in each app (copy its `.env.example`) with the same two variables, then install and
run:

```bash
# taskflow
cp www/taskflow/.env.example www/taskflow/.env      # then fill in the values
npm --prefix www/taskflow install
npm --prefix www/taskflow run dev

# admin-dashboard
cp www/admin-dashboard/.env.example www/admin-dashboard/.env
npm --prefix www/admin-dashboard install
npm --prefix www/admin-dashboard run dev
```

Other scripts (per app): `npm run build`, `npm run lint` (oxlint), `npm run preview`.

### 5. Grant admin access

The admin-dashboard is gated: a user is an admin only if they have a row in `public.admins`. That
table is write-locked (a user can read only their own row and cannot grant themselves admin), so add
admins from the Supabase SQL Editor. The user must have signed up first.

```sql
-- Idempotent — no-op if the user hasn't signed up yet or is already an admin.
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR_EXPECTED_ADMIN_EMAIL'
on conflict (user_id) do nothing;
```

## Demo

- YouTube walkthrough: _coming soon_
- Live deployment: https://srttaskflow.pages.dev/
