# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Two planning documents (`prd.md`, `test_requirements.md`) sit at the repo root — see "Which spec is the
target" below. Code lives under `www/`:

- `www/taskflow` — the active build. React 19 + Vite, React Router v7, TailwindCSS v4 via `@tailwindcss/vite`.
  A Kanban UI (login, dashboard, board with drag-and-drop cards) is scaffolded and routed, but it runs
  entirely on in-memory mock data — see "taskflow frontend architecture" below.
- `www/admin-dashboard` — still the untouched Vite/React default template (a single placeholder `App.jsx`).
  Not yet started.

Both have `@supabase/supabase-js` installed and a `src/lib/supabaseClient.js` reading `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` from `.env` (gitignored; see `.env.example` for the shape), but neither project
actually calls Supabase yet — the client is wired but unused.

Common commands (run from inside each project directory):

```
npm install
npm run dev      # Vite dev server
npm run build    # production build
npm run lint     # oxlint (not ESLint)
npm run preview  # preview production build
```

There is no root-level package.json/workspace config tying the two projects together — each is
installed and run independently. Neither project has a test script configured.

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

## Which spec is the target

`prd.md` and `test_requirements.md` describe two different, mismatched projects (a full multi-user Kanban
SaaS with Workspace-RBAC vs. a single-user Todo assessment). The `www/taskflow` build already in progress
follows **`prd.md`**: its terminology (Workspaces, Boards, Lists, Cards), the RBAC copy on the login page,
and the card modal fields (labels, assignees, due dates, checklists, attachments, comments) all match PRD
section 3 and the `supabase/db` schema directly. Treat `prd.md` as the live spec; `test_requirements.md`
is not being built against. If a task seems to call for the smaller Todo-app scope instead, confirm with
the user before switching direction — don't assume it silently supersedes the Kanban build already underway.

## taskflow frontend architecture

`www/taskflow/src/App.jsx` sets up three routes under `BrowserRouter`: `/login`, and `/dashboard` +
`/board/:boardId` behind `ProtectedRoute` (which just checks `AuthContext.isAuthenticated`). Three
context providers wrap the whole app:

- **`AuthContext`** (`context/AuthContext.jsx`) — currently a local stub: `login()`/`logout()` just flip
  a boolean in `useState`. No Supabase Auth call is wired up yet, so anyone can "log in" from the login
  form regardless of what's typed.
- **`BoardDataContext`** (`context/BoardDataContext.jsx`) — holds all workspace/board/list/card state via
  a `useReducer` seeded entirely from `lib/mockData.js` (`MOVE_CARD`, `ADD_CARD`, `TOGGLE_CHECKLIST_ITEM`,
  `ADD_COMMENT` actions). Nothing here reads from or writes to Supabase — it's an in-memory simulation of
  the real schema, structured to make swapping in real Supabase queries later reasonably mechanical (the
  action shapes mirror what the RLS-backed tables would need).
- **`ThemeContext`** (`context/ThemeContext.jsx`) — light/dark theme, applied as CSS custom properties
  (`lib/theme.js` token maps) set on `document.documentElement` rather than via Tailwind's `dark:` classes.

Component layout: `pages/` (LoginPage, DashboardPage, BoardPage) compose `components/layout/`
(Sidebar, DashboardHeader, BoardHeader, ProtectedRoute) and `components/board/` (BoardColumn, BoardCard,
BoardTile, CardComposer, CardModal), with low-level pieces in `components/ui/` (Icon, IconButton, Avatar).
Card drag-and-drop in `BoardPage.jsx` is hand-rolled with native HTML5 drag events (no `dnd-kit` or
`@hello-pangea/dnd`, despite `prd.md` proposing those libraries) — reorder/move logic lives in the
`MOVE_CARD` reducer case in `BoardDataContext`.

**When wiring real data in:** the natural seams are replacing `AuthContext`'s stub with
`supabaseClient.auth` calls, and replacing `BoardDataContext`'s reducer with Supabase queries/mutations
(and eventually Realtime subscriptions) against the `boards`/`lists`/`cards` tables — the action/shape
contracts consumers already depend on (`lists`, `moveCard`, `addCard`, etc.) shouldn't need to change.
