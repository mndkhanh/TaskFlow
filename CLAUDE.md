# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Two planning documents (`prd.md`, `test_requirements.md`) sit at the repo root — see "Which spec is the
target" below. Code lives under `www/`:

- `www/taskflow` — the active build. React 19 + Vite, React Router v7, TailwindCSS v4 via `@tailwindcss/vite`.
  A Kanban UI (login, dashboard, board with drag-and-drop cards) is scaffolded and routed. **Nearly all
  data is now wired to real Supabase** — auth, workspaces, boards, lists/cards, and card
  checklists/comments/assignees/labels/attachments all persist (attachments via a Supabase Storage bucket).
  Workspace member management + invitations and Realtime (board lists/cards + Inbox) are also wired — see
  "taskflow frontend architecture" below.
- `www/admin-dashboard` — a **read-only admin console** (React 19 + Vite + Tailwind v4; **no** React
  Router — it's a single-page auth gate, not routed). Gated behind Supabase email/password auth **and** an
  admin check: `context/AuthContext.jsx` resolves the session, then queries the `public.admins` table for
  the caller's own row (tri-state `adminStatus` so the "access denied" screen never flashes mid-check).
  `App.jsx` is the gate — `LoginPage` → `AccessDenied` (signed in, not admin) → `Dashboard`. The
  `Dashboard` KPIs/chart/tables render **real instance-wide data** fetched via `lib/adminApi.js` →
  the `public.admin_dashboard()` RPC (one JSON round-trip; see `supabase/db/admin_script.sql`), with
  loading/error/refresh states. There is **no** mock-data file. The anon client can't read across
  workspaces (RLS), so the RPC is `SECURITY DEFINER` + gated on `private.is_admin()` — the same
  public-RPC/internal-gate pattern as the invite RPCs.

Both have `@supabase/supabase-js` installed and a `src/lib/supabaseClient.js` reading `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` from `.env` (gitignored; see `.env.example` for the shape). Both call Supabase
for real now: `www/taskflow` for auth + workspace queries/RPC, `www/admin-dashboard` for auth + the admin
self-check against `public.admins`.

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

**There is currently no CI/CD.** The `.github/` directory does not exist — two workflows
(`taskflow-ci.yml` = lint+build, `taskflow-deploy.yml` = Cloudflare Pages deploy of `www/taskflow/dist`)
existed earlier but were **removed** in commit `618e8c4` ("these two files no longer in use"). Their
history remains in git (`git log --all -- .github/`) if you need to restore or reference them, but nothing
runs on push/PR today. Lint and build are manual (`npm run lint` / `npm run build` inside `www/taskflow`).
If you re-add a pipeline, the build needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from repo secrets.

## Supabase backend

The Supabase project is named **TaskFlow** (ref `eyrxpgfwjoucgfjqinro`, region ap-northeast-1). Structure:

- `supabase/db/` — **the canonical, hand-maintained schema source.** Currently: `initial_schema.sql` (12
  tables — profiles, workspaces, workspace_members, boards, lists, cards, card_assignees, checklists,
  comments, labels, card_labels, attachments; boards/cards carry `is_archived`), `functions_triggers.sql`
  (auto-provision profile + personal workspace on signup, `updated_at` maintenance), `rls_policies.sql`
  (Workspace-RBAC: owner/member write, viewer read-only), and `harden_functions.sql` (moves internal
  RLS-helper functions into a non-exposed `private` schema and pins `search_path` on every function — see
  below; **also** carries the labels/card_labels/attachments RLS policies, the `card-attachments`
  Storage bucket + its member-scoped storage policies, the **public** `board-banners` Storage bucket +
  member-gated write policies for board banner images, the `activities`/`activity_reads` tables, and — at
  the very end — the workspace-membership layer: the `workspace_invitations` table + RLS, and SECURITY
  DEFINER RPCs implementing an **explicit accept/decline invitation flow** (`list_workspace_members` —
  members-with-email, since `auth.users` isn't readable by `authenticated`; `invite_to_workspace` —
  owner-only, always queues a *pending* invite for an email; `list_my_invitations` — invites addressed to
  the caller by email, with workspace + inviter info; `accept_invitation`/`decline_invitation` — the
  invitee joins or discards). No auto-join: the invitee must accept.
- `supabase/db/admin_script.sql` — the whole backend for `www/admin-dashboard` (admin auth gate **and**
  its data source), in one file:
  - `public.admins` table (a `user_id` per admin) with RLS that lets an authenticated user read **only
    their own** row (so the client can self-check admin status) and **no** insert/update/delete policy —
    admin can't be self-granted (only service_role / direct SQL adds one). This is why admin is a separate
    write-locked table, not an `is_admin` column on `profiles`, which has a self-update policy. Plus the
    `private.is_admin()` helper. The file carries **no seed** — grant the first admin by hand:
    `insert into public.admins (user_id) select id from auth.users where email = '…';`.
  - `public.admin_dashboard()` (SECURITY DEFINER, `search_path=''`, gated on `private.is_admin()`, EXECUTE
    for `authenticated`/`service_role`) returns one jsonb blob: `stats` (workspaces/boards/users/cards
    totals + 7d-vs-prior-7d delta + 7-day sparkline), `activity` (7-day cards/comments), `workspaces`
    (top 8 by member count, with owner/members/boards/cards/created), and `recentUsers` (last 6 signups
    from `auth.users` — email + derived active/invited/suspended status, readable only because the definer
    bypasses RLS). The per-KPI `private._admin_stat(entity, label)` helper lives in `private` (allowlisted
    table names for its dynamic SQL) so it isn't a REST endpoint.
  - **⚠ Not applied to the remote via a recorded migration** — the MCP `apply_migration` was
    permission-denied this session (production-deploy + admin-grant guardrail), so run this file by hand in
    the Supabase SQL Editor, then `get_advisors` (security). Until it's applied, `admins`/`admin_dashboard`
    don't exist and admin-dashboard login lands on "access denied" (missing table) or the dashboard shows a
    load error (missing RPC).
- `supabase/functions/` — edge functions. `send-invite-email/index.ts` sends a workspace-invitation
  email; it's invoked (fire-and-forget, not awaited) from `inviteToWorkspace` in `BoardDataContext.jsx`
  after the `invite_to_workspace` RPC queues the pending invite. See the invite-email edge-function setup
  notes in the README.

The workspace-membership section at the tail of `harden_functions.sql` (the `workspace_invitations` table
+ the `list_workspace_members` / `invite_to_workspace` / `list_my_invitations` / `accept_invitation` /
`decline_invitation` RPCs) **is live on the remote** — applied by hand via the SQL Editor (the MCP was
read-only this session, so it was not recorded as a migration; same out-of-band pattern as the rest of this
file). Note the `RETURNS TABLE` gotcha it surfaced: `list_my_invitations` has an output column named `id`,
so any *unqualified* `id` in its body is ambiguous — the `auth.users` lookup must be aliased
(`from auth.users au where au.id = auth.uid()`), not `where id = auth.uid()`.

There is deliberately no `supabase/migrations/` directory — we don't use the CLI's local migration-folder
workflow. These four files have already been applied to the remote project.

**The recorded `harden_functions` migration is a stale snapshot of `harden_functions.sql` (verified
2026-07-08).** The migration history records exactly four migrations — `initial_schema`,
`functions_triggers`, `rls_policies`, `harden_functions` — but the *recorded text* of the
`harden_functions` migration predates most of the current file. Everything from roughly line 315 onward of
`supabase/db/harden_functions.sql` — the `public.create_workspace` RPC, the card-labels/attachments RLS +
`card-attachments` Storage bucket, the `board-banners` Storage bucket, and the `activities`/`activity_reads`
tables — is **not** in the recorded migration statements, yet **all of it is live on the remote** (applied
out-of-band via `execute_sql`/console rather than a recorded `apply_migration`). So the **file is the source
of truth** and matches the remote; the migration *log* just doesn't record how those objects got there.
Confirmed present on the remote 2026-07-08: `public.create_workspace` (SECURITY DEFINER, `search_path=''`,
EXECUTE for `authenticated`/`service_role`), both the `card-attachments` (private) and `board-banners`
(public) buckets with their policies, and the activity tables — so banner *uploads* work (this was formerly
flagged as a bucket-missing runtime bug; it has since been resolved). Re-verify against the live project
(`list_migrations`, query the migration `statements`, `storage.buckets`, `pg_policies`) before trusting this
note — it's the most perishable part of this doc.

Do **not** re-split `create_workspace` into a separate `supabase/db/workspace_functions.sql` — it already
lives inline in `harden_functions.sql`, and the `createWorkspace` comment in `BoardDataContext.jsx` already
points there correctly. If you ever reconcile the drift, prefer re-recording the current
`harden_functions.sql` as a fresh migration over hand-authoring split files.

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
  color; `mapWorkspaces` also carries the raw `myRole` + `memberCount`, and the context exposes
  `activeWorkspace`/`activeRole` for gating owner-only actions), and creates new ones through the
  `create_workspace` RPC (then refetches and switches to it). **Workspace member management + invitations
  are wired:** `listWorkspaceMembers`/`listWorkspaceInvitations`, `inviteToWorkspace` (owner queues a
  pending email invite — no auto-join), `updateMemberRole`, `removeMember`, `revokeInvitation`,
  `leaveWorkspace`, and workspace settings `renameWorkspace`/`deleteWorkspace` — role changes/removal/
  leave/rename/delete are plain table writes gated by the existing `workspace_members`/`workspaces` RLS;
  invitations go through the workspace-membership RPCs at the tail of `harden_functions.sql`. The
  **invitee side** is `myInvitations` (fetched via `list_my_invitations` on login) + `acceptInvitation`
  (joins + switches to the workspace) / `declineInvitation`; the manage UI lives in
  `components/layout/WorkspaceModal.jsx` (a tabbed Members/Settings modal) opened from the two (previously
  dead) `WorkspaceSwitcher` menu rows — "Invite and manage members" and "Settings" — while pending
  invitations for the current user surface **inside the `WorkspaceSwitcher` "Switch workspace" flyout**
  (above "Create workspace", with Accept/Decline) plus a red count badge on the switcher.
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
title-only composer — CardModal, `BoardRightSidebar`, plus `BoardListView` and `CreateBoardModal`), with
low-level pieces in `components/ui/` (Icon,
IconButton, Avatar). `BoardHeader`'s left side is a URL-style breadcrumb: the workspace name links back to
`/dashboard`, and the board name is a `CrumbDropdown` for switching boards. `BoardPage.jsx` renders the
board in one of two views — **kanban** (horizontal `BoardColumn`s) or **list** (`BoardListView`, vertical
stacked sections of compact card rows). **Both views** use the same native HTML5 drag-and-drop (no
`dnd-kit`/`@hello-pangea/dnd` despite `prd.md` proposing them) — the drag handlers live in `BoardPage` and
call `moveCard` (card reorder/move) and `moveList` (horizontal column reorder in kanban; the column header
is the drag handle). The active view is now selected inside the **board panel** (below), persisted to
`localStorage` under `tf.boardView`.

**Board panel (`BoardRightSidebar`):** a persistent right-hand sidebar on `BoardPage`, toggled by the
"Panel" button in `BoardHeader` (which replaced the old standalone view toggle + dead Filter button; its
open state persists under `tf.boardPanelOpen`, active tab under `tf.boardPanelTab`). Four tabs: **Info**
(rename board via `renameBoard`, banner set-by-URL/upload/remove, created date + list/card counts, delete
board via `deleteBoard`), **Members** (workspace members pool), **Labels** (board labels with colors —
create/rename/recolor via `createLabel`/`updateLabel`, delete via `deleteLabel`), and **Filter** (Board/List
view switch + client-side card filtering by keyword/members/labels/due). Filter state lives in `BoardPage`
(`EMPTY_FILTER`/`filterActiveCount` are exported from `BoardRightSidebar`) and is applied via a
`filteredLists` memo before rendering either view; the header Panel button shows a badge with the active
filter count. Note there is **no** separate header settings popover — View/Filter/Banner/board-settings all
live in these tabs by design.

**Remaining data-wiring work:** auth, workspaces, boards, lists/cards, and all card detail
(checklists, comments, assignees, labels, attachments) are wired. **Realtime is now wired** in
`BoardDataContext`: two `postgres_changes` subscriptions — one per open board (`lists` filtered by
`board_id` + `cards` related via `list_id`) that debounce-refetches the board, and one per active
workspace on `activities` that debounce-refreshes the Inbox. Both respect RLS. **Requires the tables to be
in the `supabase_realtime` publication** — recorded as an idempotent `do $$ … $$` block at the tail of
`harden_functions.sql` (adds `lists`, `cards`, `activities`). Like the rest of that file it must be applied
to the remote by hand (SQL Editor) since the MCP was read-only; realtime stays dormant until it is.
Board **banners** are wired: `updateBoardBanner`/`removeBoardBanner` upload to the `board-banners`
bucket and store the public URL in `boards.background_url`; `mapBoards` exposes it as `board.image`
(rendered as the tile banner and the board-page background, with a `board.gradient` fallback still
synthesized by list position). `cardCount`/`avatars` on tiles remain empty rather than derived from
real data. The collapsible sidebar state lives in `SidebarContext` (persisted to `localStorage` under
`tf.sidebarCollapsed`); the toggle button (`components/layout/SidebarToggle`) sits at the far left of
each page header.

**Activity feed / Inbox:** an `activities` table (workspace-scoped, append-only) plus an `activity_reads`
table (per-`(activity,user)` read marker; absence = unread) back a real Inbox — both live at the tail of
`harden_functions.sql` (their RLS uses the `private.*` helpers). `BoardDataContext` logs events
best-effort via a stable `logActivity` callback (reading a `activityMetaRef` of the current
workspace/board/user) from the mutation handlers: `board_created`, `card_created`, `card_moved` (only on a
list change), `card_archived`, `comment_added`. It also fetches the workspace feed (embedding the
RLS-filtered `activity_reads` so a non-empty array means "read"), exposes `activities`/`unreadCount`
(unread excludes your own actions) and `markActivityRead`/`markActivityUnread`/`markAllActivitiesRead`/
`refreshActivities`. `pages/InboxPage` renders the cross-board feed with read/unread controls (row click
marks read + navigates to the board), and `Sidebar` shows an unread badge on the Inbox item. Not yet wired:
Realtime is wired (see above): a `postgres_changes` subscription on `activities` (filtered by workspace)
debounce-refreshes the feed, so another client's new activity appears live once the publication is enabled.
Theme choice persists to `localStorage` under `tf.theme` (falling back to the OS `prefers-color-scheme`).
