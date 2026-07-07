# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Two planning documents (`prd.md`, `test_requirements.md`) sit at the repo root — see "Which spec is the
target" below. Code lives under `www/`:

- `www/taskflow` — the active build. React 19 + Vite, React Router v7, TailwindCSS v4 via `@tailwindcss/vite`.
  A Kanban UI (login, dashboard, board with drag-and-drop cards) is scaffolded and routed. **Nearly all
  data is now wired to real Supabase** — auth, workspaces, boards, lists/cards, and card
  checklists/comments/assignees/labels/attachments all persist (attachments via a Supabase Storage bucket).
  What's left is Realtime subscriptions — see "taskflow frontend architecture" below.
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

## CI/CD

Two GitHub Actions workflows under `.github/workflows/`, both scoped to `www/taskflow/**` path changes
(`admin-dashboard` has no pipeline yet):

- `taskflow-ci.yml` — on push to **any** branch and on PRs: `npm ci`, `npm run lint`, `npm run build`
  (build needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, supplied from repo secrets).
- `taskflow-deploy.yml` — on push to `main` (or manual `workflow_dispatch`): builds, then deploys
  `www/taskflow/dist` to **Cloudflare Pages** (project `taskflow`) via `wrangler-action`. Needs
  `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets in addition to the Supabase ones.

## Supabase backend

The Supabase project is named **TaskFlow** (ref `eyrxpgfwjoucgfjqinro`, region ap-northeast-1). Structure:

- `supabase/db/` — **the canonical, hand-maintained schema source.** Currently: `initial_schema.sql` (12
  tables — profiles, workspaces, workspace_members, boards, lists, cards, card_assignees, checklists,
  comments, labels, card_labels, attachments; boards/cards carry `is_archived`), `functions_triggers.sql`
  (auto-provision profile + personal workspace on signup, `updated_at` maintenance), `rls_policies.sql`
  (Workspace-RBAC: owner/member write, viewer read-only), and `harden_functions.sql` (moves internal
  RLS-helper functions into a non-exposed `private` schema and pins `search_path` on every function — see
  below; **also** carries the labels/card_labels/attachments RLS policies, the `card-attachments`
  Storage bucket + its member-scoped storage policies, and — appended at the end — the **public**
  `board-banners` Storage bucket + member-gated write policies for board banner images).
- `supabase/functions/` — placeholder for edge functions; empty so far.

There is deliberately no `supabase/migrations/` directory — we don't use the CLI's local migration-folder
workflow. These four files have already been applied to the remote project.

**Known drift:** the taskflow frontend calls a `create_workspace` Postgres RPC (`supabase.rpc("create_workspace", …)`
in `BoardDataContext.jsx`), and a code comment there points to `supabase/db/workspace_functions.sql` — but
that file does not exist in `supabase/db/` yet. The function **does exist on the remote** (`public.create_workspace`,
confirmed 2026-07-08) but is absent from both the captured SQL and the migration history — it was applied
out-of-band. Capture it (add `workspace_functions.sql` with the RPC's definition) before treating
`supabase/db/` as a faithful mirror of the remote.

**Not-yet-applied (still failing):** the `board-banners` Storage bucket + policies (now the trailing
section of `harden_functions.sql`, formerly the standalone `board_banners.sql`) were authored but **never
applied to the remote** — confirmed 2026-07-08 that the bucket does not exist (only `card-attachments`
does), and the migration history holds just the four migrations below. This is a **live runtime bug**: even
though the banner feature is merged to `main`, deployed, and fully wired in the frontend
(`updateBoardBanner`/`removeBoardBanner`), any banner *upload* fails because the target bucket is missing.
(Setting a banner by external URL via `setBoardBannerUrl` writes straight to `boards.background_url` and
works without the bucket.) Apply that bucket section via `apply_migration` (then run `get_advisors`) to fix
uploads.

The remote migration history currently records exactly four migrations, in order: `initial_schema`,
`functions_triggers`, `rls_policies`, `harden_functions`.

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
  position since the table only stores an optional `background_url`; `cardCount`/`avatars` stay empty),
  and `createBoard` inserts the board **plus four default lists** (`DEFAULT_LIST_TITLES`) so it's usable
  immediately. Lists/cards are real too: `BoardPage` pushes the routed `boardId` into `activeBoardId`,
  which triggers a nested `lists(…, cards(…))` fetch (RLS-scoped, ordered by `position`). `lists` is now
  plain `useState` (not a reducer); `moveCard` applies an optimistic reorder then persists via
  `persistPositions` (writes each affected card's `list_id` + index; refetches to reconcile on error),
  and `addCard` inserts then appends the real row. **Card detail is now fully persisted:** the nested
  fetch pulls `card_labels`/`card_assignees`/`checklists`/`comments`/`attachments`; mutation handlers
  (`toggleChecklistItem`, `addComment`, `toggleAssignee`, `toggleLabel`, attachment upload/delete) write
  to those tables (comments/assignees resolve author/member ids against separately fetched `profiles`
  maps rather than an FK embed). Attachments upload to the `card-attachments` Storage bucket and store
  metadata in the `attachments` table, with signed-URL download and best-effort blob cleanup on delete.
  Board-scoped `labels` are fetched alongside lists per board. `archiveCard` flips `is_archived`.
  `mapCard` carries a `position` field the UI ignores.
- **`ThemeContext`** (`context/ThemeContext.jsx`) — light/dark theme, applied as CSS custom properties
  (`lib/theme.js` token maps) set on `document.documentElement` rather than via Tailwind's `dark:` classes.

Component layout: `pages/` (LoginPage, DashboardPage, BoardPage) compose `components/layout/`
(Sidebar, DashboardHeader, BoardHeader, ProtectedRoute, plus `WorkspaceSwitcher` — the workspace dropdown —
and `CreateWorkspaceModal`) and `components/board/` (BoardColumn, BoardCard, BoardTile, `CreateCardModal`
— a full up-front card form (title, description, due date, labels, members), replacing the old inline
title-only composer — CardModal, plus `BoardListView` and `CreateBoardModal`), with low-level pieces in `components/ui/` (Icon,
IconButton, Avatar). `BoardHeader`'s left side is a URL-style breadcrumb: the workspace name links back to
`/dashboard`, and the board name is a `CrumbDropdown` for switching boards. `BoardPage.jsx` renders the
board in one of two views — **kanban** (horizontal `BoardColumn`s) or **list** (`BoardListView`, vertical
stacked sections of compact card rows). **Both views** use the same native HTML5 drag-and-drop (no
`dnd-kit`/`@hello-pangea/dnd` despite `prd.md` proposing them) — the drag handlers live in `BoardPage` and
call `moveCard`; there's a single drag state shared across views. The active view is a segmented toggle in
`BoardHeader`, persisted to `localStorage` under `tf.boardView`.

**Remaining data-wiring work:** auth, workspaces, boards, lists/cards, and all card detail
(checklists, comments, assignees, labels, attachments) are wired. The main gap left is **Realtime
subscriptions** on `lists`/`cards` (still not wired — changes from other clients don't push through).
Board **banners** are wired: `updateBoardBanner`/`removeBoardBanner` upload to the `board-banners`
bucket and store the public URL in `boards.background_url`; `mapBoards` exposes it as `board.image`
(rendered as the tile banner and the board-page background, with a `board.gradient` fallback still
synthesized by list position). `cardCount`/`avatars` on tiles remain empty rather than derived from
real data. The collapsible sidebar state lives in `SidebarContext` (persisted to `localStorage` under
`tf.sidebarCollapsed`); the toggle button (`components/layout/SidebarToggle`) sits at the far left of
each page header. `/inbox` is a routed placeholder page (`pages/InboxPage`).
