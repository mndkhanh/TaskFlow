# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Two planning documents (`prd.md`, `test_requirements.md`) sit at the repo root. Code lives under `www/`:

- `www/admin-dashboard` — React + Vite (JS), TailwindCSS v4 via `@tailwindcss/vite`.
- `www/taskflow` — React + Vite (JS), TailwindCSS v4 via `@tailwindcss/vite`.

Both are freshly scaffolded (`npm create vite@latest -- --template react`) with the default boilerplate
markup/CSS stripped out and replaced by a minimal Tailwind placeholder `App.jsx`. Both have
`@supabase/supabase-js` installed and a `src/lib/supabaseClient.js` reading `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` from `.env` (gitignored; see `.env.example` for the shape). No routing, state
management, or app-specific features exist yet beyond that — treat both as empty shells wired to the backend.

Common commands (run from inside each project directory):

```
npm install
npm run dev      # Vite dev server
npm run build    # production build
npm run lint     # ESLint
npm run preview  # preview production build
```

There is no root-level package.json/workspace config tying the two projects together — each is
installed and run independently.

## Supabase backend

The Supabase project is named **TaskFlow** (ref `eyrxpgfwjoucgfjqinro`, region ap-northeast-1). Structure:

- `supabase/db/` — **the canonical, hand-maintained schema source.** Currently: `initial_schema.sql` (the
  9 tables from `prd.md` section 4), `functions_triggers.sql` (auto-provision profile + personal workspace
  on signup, `updated_at` maintenance), `rls_policies.sql` (Workspace-RBAC: owner/member write, viewer
  read-only), and `harden_functions.sql` (moves internal RLS-helper functions into a non-exposed `private`
  schema and pins `search_path` on every function — see below for why).
- `supabase/functions/` — placeholder for edge functions; empty so far.

There is deliberately no `supabase/migrations/` directory — we don't use the CLI's local migration-folder
workflow. All four files in `supabase/db/` have already been applied to the remote project and match its
current state exactly.

**Applying future schema changes:** edit/add SQL in `supabase/db/`, then apply that same SQL to the
remote project via the Supabase MCP `apply_migration` tool (not `execute_sql` — that one's for querying,
`apply_migration` is for DDL and records proper migration history on the remote database itself, so no
local migrations folder is needed). After applying, run `get_advisors` (security type) and fix anything
it flags before considering the change done — see the `private` schema below for why that check matters.

**Why the `private` schema:** `is_workspace_member`, `current_workspace_role`, `board_workspace_id`,
`list_workspace_id`, `card_workspace_id` are `SECURITY DEFINER` functions used only as internal building
blocks inside RLS policies (they need elevated privilege to check `workspace_members` without RLS on that
table recursively blocking the check). Any function in the `public` schema is automatically exposed by
Supabase's Data API as an HTTP RPC endpoint, and Postgres grants `EXECUTE` to `PUBLIC` by default — so a
`SECURITY DEFINER` function left in `public` is a public, privilege-elevated API endpoint whether you
meant it to be or not (Supabase's advisor flags this). Revoking `EXECUTE` from `authenticated` isn't an
option since RLS itself needs that role to call these functions when evaluating policies. The fix is
keeping them in `private` (not in the Data API's exposed-schema list): policies can still call
`private.foo(...)` freely by schema-qualified name, but the functions are no longer reachable via
`/rest/v1/rpc/...`.

## The two specs conflict — clarify before building

`prd.md` and `test_requirements.md` describe two different, mismatched projects:

- **`prd.md`** — "TaskFlow": a full multi-user Kanban SaaS (Trello-like) with Supabase Auth/Postgres/Realtime/Storage,
  a React+Vite+TailwindCSS frontend, drag-and-drop boards/lists/cards, workspace RBAC (`owner`/`member`/`viewer`),
  and a proposed 9-table relational schema (see section 4 of the file for the schema).
- **`test_requirements.md`** — a much smaller "Intern Developer Assessment": a single-user Todo List app
  (CRUD + toggle complete + filter/search) with a free choice of stack, meant to be delivered in 2 days with a
  README and optional Docker/tests/deployment.

These are not phases of the same plan — they differ in scope, auth model, and stack constraints. Before
scaffolding anything, confirm with the user which document is the actual target (or whether `test_requirements.md`
is the graded deliverable and `prd.md` is aspirational/future scope beyond it). Do not silently merge both specs
into one implementation.

## When implementation starts

Once a stack is chosen and code is scaffolded, update this file with the real build/lint/test commands and the
actual architecture — do not leave this section speculative.
