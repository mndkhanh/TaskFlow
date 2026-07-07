# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Two planning documents (`prd.md`, `test_requirements.md`) sit at the repo root — see "Which spec is the
target" below. Code lives under `www/`:

- `www/taskflow` — the active build. React 19 + Vite, React Router v7, TailwindCSS v4 via `@tailwindcss/vite`.
  A Kanban UI (login, dashboard, board with drag-and-drop cards) is scaffolded and routed. **Auth,
  workspaces, and boards are now wired to real Supabase; lists/cards are still in-memory mock data** — see
  "taskflow frontend architecture" below for exactly where the seam is.
- `www/admin-dashboard` — still the untouched Vite/React default template (a single placeholder `App.jsx`).
  Not yet started.

Both have `@supabase/supabase-js` installed and a `src/lib/supabaseClient.js` reading `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` from `.env` (gitignored; see `.env.example` for the shape). `www/taskflow` calls
Supabase for real (auth + workspace queries/RPC); `www/admin-dashboard` has the client wired but unused.

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
workflow. These four files have already been applied to the remote project.

**Known drift:** the taskflow frontend calls a `create_workspace` Postgres RPC (`supabase.rpc("create_workspace", …)`
in `BoardDataContext.jsx`), and a code comment there points to `supabase/db/workspace_functions.sql` — but
that file does not exist in `supabase/db/` yet. Either the RPC was applied to the remote without capturing
its SQL here, or the call is ahead of the schema. Reconcile this (add `workspace_functions.sql` with the
RPC's definition) before treating `supabase/db/` as a faithful mirror of the remote.

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

`www/taskflow/src/App.jsx` nests the providers `ThemeProvider > AuthProvider > BoardDataProvider` (order
matters: `BoardDataContext` calls `useAuth()` for the current user id), then `BrowserRouter` with `/login`,
`/dashboard` + `/board/:boardId` behind `ProtectedRoute`, and `/` + `*` redirecting to `/dashboard`.

- **`AuthContext`** (`context/AuthContext.jsx`) — **real Supabase Auth.** On mount it reads
  `supabase.auth.getSession()` and subscribes to `onAuthStateChange`; exposes `session`, `user`,
  `isAuthenticated`, a `loading` flag (true until the first session check resolves), plus
  `signInWithPassword`, `signUpWithPassword` (passes `full_name` in user metadata, returns a
  `needsEmailConfirmation` flag), `signInWithGoogle` (OAuth, redirects to `/dashboard`), and `logout`.
  `ProtectedRoute` renders a "Loading…" screen while `loading`, then gates on `isAuthenticated`.
- **`BoardDataContext`** (`context/BoardDataContext.jsx`) — **hybrid, mid-migration.** Workspaces are
  real: it queries `workspace_members` (RLS scopes rows to the user's workspaces) joined to `workspaces`,
  collapses them via `mapWorkspaces` into the sidebar's display shape (assigning each a stable accent
  color), and creates new ones through the `create_workspace` RPC (then refetches and switches to it).
  Boards are also real: on `activeWorkspaceId` change it fetches from the `boards` table (RLS-scoped),
  maps rows to the tile display shape via `mapBoards` (synthesizing a stable gradient/`color` by list
  position since the table only stores an optional `background_url`; `cardCount`/`avatars` stay empty
  until cards are wired), and `createBoard` inserts then refetches. Lists/cards are **still mock** from
  `lib/mockData.js`: `lists` is a `useReducer` over mock data (`MOVE_CARD`, `ADD_CARD`,
  `TOGGLE_CHECKLIST_ITEM`, `ADD_COMMENT`), so every real board opens onto the same mock columns for now.
- **`ThemeContext`** (`context/ThemeContext.jsx`) — light/dark theme, applied as CSS custom properties
  (`lib/theme.js` token maps) set on `document.documentElement` rather than via Tailwind's `dark:` classes.

Component layout: `pages/` (LoginPage, DashboardPage, BoardPage) compose `components/layout/`
(Sidebar, DashboardHeader, BoardHeader, ProtectedRoute, plus `WorkspaceSwitcher` — the workspace dropdown —
and `CreateWorkspaceModal`) and `components/board/` (BoardColumn, BoardCard, BoardTile, CardComposer,
CardModal, plus `BoardListView` and `CreateBoardModal`), with low-level pieces in `components/ui/` (Icon,
IconButton, Avatar). `BoardPage.jsx` renders the board in one of two views — **kanban** (horizontal
`BoardColumn`s with native HTML5 drag-and-drop; no `dnd-kit`/`@hello-pangea/dnd` despite `prd.md` proposing
them — reorder/move logic is the `MOVE_CARD` reducer case) or **list** (`BoardListView`, vertical stacked
sections of compact card rows, no drag). The active view is a segmented toggle in `BoardHeader` and is
persisted to `localStorage` under `tf.boardView`.

**Remaining data-wiring work:** the auth, workspace, and board seams are done. What's left is replacing the
mock `lists` reducer with Supabase queries/mutations (and eventually Realtime) against the `lists`/`cards`
tables, keyed on the real board UUID — the action/shape contracts consumers depend on (`lists`, `moveCard`,
`addCard`, etc.) are meant to stay stable across that swap. Note `mapBoards`' `cardCount`/`avatars` are
hardcoded to empty and become real only once cards are wired.
