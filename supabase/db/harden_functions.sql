-- Security hardening per `supabase db advisors` findings:
-- 1. Every function gets a fixed search_path (mitigates search_path hijacking).
-- 2. RLS helper functions are internal-only, not public RPC surface, so they move
--    into a `private` schema that isn't exposed to the Data API.

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid()
  );
$$;

create or replace function private.current_workspace_role(_workspace_id uuid)
returns public.workspace_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.workspace_members
  where workspace_id = _workspace_id and user_id = auth.uid();
$$;

create or replace function private.board_workspace_id(_board_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select workspace_id from public.boards where id = _board_id;
$$;

create or replace function private.list_workspace_id(_list_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select b.workspace_id
  from public.lists l
  join public.boards b on b.id = l.board_id
  where l.id = _list_id;
$$;

create or replace function private.card_workspace_id(_card_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select b.workspace_id
  from public.cards c
  join public.lists l on l.id = c.list_id
  join public.boards b on b.id = l.board_id
  where c.id = _card_id;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_workspace_id uuid;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, v_display_name, new.raw_user_meta_data ->> 'avatar_url');

  insert into public.workspaces (name, created_by)
  values (v_display_name || '''s Workspace', new.id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Repoint every RLS policy at the relocated private helpers

drop policy if exists "Members can view their workspaces" on public.workspaces;
create policy "Members can view their workspaces"
  on public.workspaces for select
  to authenticated
  using (private.is_workspace_member(id));

drop policy if exists "Owners can update their workspace" on public.workspaces;
create policy "Owners can update their workspace"
  on public.workspaces for update
  to authenticated
  using (private.current_workspace_role(id) = 'owner')
  with check (private.current_workspace_role(id) = 'owner');

drop policy if exists "Owners can delete their workspace" on public.workspaces;
create policy "Owners can delete their workspace"
  on public.workspaces for delete
  to authenticated
  using (private.current_workspace_role(id) = 'owner');

drop policy if exists "Members can view workspace membership" on public.workspace_members;
create policy "Members can view workspace membership"
  on public.workspace_members for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Owners can add workspace members" on public.workspace_members;
create policy "Owners can add workspace members"
  on public.workspace_members for insert
  to authenticated
  with check (private.current_workspace_role(workspace_id) = 'owner');

drop policy if exists "Owners can update member roles" on public.workspace_members;
create policy "Owners can update member roles"
  on public.workspace_members for update
  to authenticated
  using (private.current_workspace_role(workspace_id) = 'owner')
  with check (private.current_workspace_role(workspace_id) = 'owner');

drop policy if exists "Owners can remove members, members can leave" on public.workspace_members;
create policy "Owners can remove members, members can leave"
  on public.workspace_members for delete
  to authenticated
  using (
    private.current_workspace_role(workspace_id) = 'owner'
    or user_id = auth.uid()
  );

drop policy if exists "Members can view boards" on public.boards;
create policy "Members can view boards"
  on public.boards for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Owners and members can create boards" on public.boards;
create policy "Owners and members can create boards"
  on public.boards for insert
  to authenticated
  with check (private.current_workspace_role(workspace_id) in ('owner', 'member'));

drop policy if exists "Owners and members can update boards" on public.boards;
create policy "Owners and members can update boards"
  on public.boards for update
  to authenticated
  using (private.current_workspace_role(workspace_id) in ('owner', 'member'))
  with check (private.current_workspace_role(workspace_id) in ('owner', 'member'));

drop policy if exists "Owners and members can delete boards" on public.boards;
create policy "Owners and members can delete boards"
  on public.boards for delete
  to authenticated
  using (private.current_workspace_role(workspace_id) in ('owner', 'member'));

drop policy if exists "Members can view lists" on public.lists;
create policy "Members can view lists"
  on public.lists for select
  to authenticated
  using (private.is_workspace_member(private.board_workspace_id(board_id)));

drop policy if exists "Owners and members can create lists" on public.lists;
create policy "Owners and members can create lists"
  on public.lists for insert
  to authenticated
  with check (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can update lists" on public.lists;
create policy "Owners and members can update lists"
  on public.lists for update
  to authenticated
  using (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'))
  with check (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can delete lists" on public.lists;
create policy "Owners and members can delete lists"
  on public.lists for delete
  to authenticated
  using (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy if exists "Members can view cards" on public.cards;
create policy "Members can view cards"
  on public.cards for select
  to authenticated
  using (private.is_workspace_member(private.list_workspace_id(list_id)));

drop policy if exists "Owners and members can create cards" on public.cards;
create policy "Owners and members can create cards"
  on public.cards for insert
  to authenticated
  with check (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can update cards" on public.cards;
create policy "Owners and members can update cards"
  on public.cards for update
  to authenticated
  using (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'))
  with check (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can delete cards" on public.cards;
create policy "Owners and members can delete cards"
  on public.cards for delete
  to authenticated
  using (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'));

drop policy if exists "Members can view card assignees" on public.card_assignees;
create policy "Members can view card assignees"
  on public.card_assignees for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy if exists "Owners and members can assign cards" on public.card_assignees;
create policy "Owners and members can assign cards"
  on public.card_assignees for insert
  to authenticated
  with check (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can unassign cards" on public.card_assignees;
create policy "Owners and members can unassign cards"
  on public.card_assignees for delete
  to authenticated
  using (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy if exists "Members can view checklist items" on public.checklists;
create policy "Members can view checklist items"
  on public.checklists for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy if exists "Owners and members can create checklist items" on public.checklists;
create policy "Owners and members can create checklist items"
  on public.checklists for insert
  to authenticated
  with check (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can update checklist items" on public.checklists;
create policy "Owners and members can update checklist items"
  on public.checklists for update
  to authenticated
  using (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'))
  with check (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can delete checklist items" on public.checklists;
create policy "Owners and members can delete checklist items"
  on public.checklists for delete
  to authenticated
  using (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy if exists "Members can view comments" on public.comments;
create policy "Members can view comments"
  on public.comments for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy if exists "Owners and members can post comments" on public.comments;
create policy "Owners and members can post comments"
  on public.comments for insert
  to authenticated
  with check (
    private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member')
    and user_id = auth.uid()
  );

drop policy if exists "Authors and owners can delete comments" on public.comments;
create policy "Authors and owners can delete comments"
  on public.comments for delete
  to authenticated
  using (
    user_id = auth.uid()
    or private.current_workspace_role(private.card_workspace_id(card_id)) = 'owner'
  );

-- Now safe to drop the old public copies of the relocated helpers
drop function if exists public.is_workspace_member(uuid);
drop function if exists public.current_workspace_role(uuid);
drop function if exists public.board_workspace_id(uuid);
drop function if exists public.list_workspace_id(uuid);
drop function if exists public.card_workspace_id(uuid);
drop function if exists public.handle_new_user();

-- Client-callable RPC: create a workspace + its owner membership atomically.
--
-- Why an RPC instead of a plain client insert: RLS on workspace_members only lets
-- an existing owner insert member rows (private.current_workspace_role(workspace_id)
-- = 'owner'). Right after creating a workspace the caller has no membership yet, so
-- they can neither add themselves as owner nor even see the workspace (the SELECT
-- policy needs membership too) — a chicken-and-egg a plain insert can't resolve.
--
-- SECURITY DEFINER (like private.handle_new_user) writes both rows in one call. Unlike
-- the RLS helpers above it is intentionally left in `public` so the Data API exposes it
-- as an RPC, and is safe because it only ever acts on auth.uid(): a caller can only ever
-- create a workspace owned by themselves. search_path is pinned and names schema-qualified.

create or replace function public.create_workspace(p_name text, p_description text default null)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := nullif(btrim(p_name), '');
  v_workspace public.workspaces;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Workspace name is required' using errcode = '23514';
  end if;

  insert into public.workspaces (name, description, created_by)
  values (v_name, nullif(btrim(p_description), ''), v_user_id)
  returning * into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace.id, v_user_id, 'owner');

  return v_workspace;
end;
$$;

-- Only signed-in users may call it (it would reject anon anyway via the auth.uid() check).
revoke execute on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;

-- ============================================================================
-- Card labels, attachments & archival RLS (tables live in initial_schema.sql;
-- the labels updated_at trigger lives in functions_triggers.sql). Kept here
-- because every policy below calls the private.* RLS helpers created above, so
-- it must be applied after them.
-- ============================================================================

-- RLS helper: label -> owning workspace (mirrors the other private.* helpers).
create or replace function private.label_workspace_id(_label_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select b.workspace_id
  from public.labels lb
  join public.boards b on b.id = lb.board_id
  where lb.id = _label_id;
$$;

alter table public.labels enable row level security;
alter table public.card_labels enable row level security;
alter table public.attachments enable row level security;

-- labels (board-scoped)
drop policy if exists "Members can view labels" on public.labels;
create policy "Members can view labels"
  on public.labels for select
  to authenticated
  using (private.is_workspace_member(private.board_workspace_id(board_id)));

drop policy if exists "Owners and members can create labels" on public.labels;
create policy "Owners and members can create labels"
  on public.labels for insert
  to authenticated
  with check (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can update labels" on public.labels;
create policy "Owners and members can update labels"
  on public.labels for update
  to authenticated
  using (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'))
  with check (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can delete labels" on public.labels;
create policy "Owners and members can delete labels"
  on public.labels for delete
  to authenticated
  using (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

-- card_labels (card-scoped)
drop policy if exists "Members can view card labels" on public.card_labels;
create policy "Members can view card labels"
  on public.card_labels for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy if exists "Owners and members can add card labels" on public.card_labels;
create policy "Owners and members can add card labels"
  on public.card_labels for insert
  to authenticated
  with check (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy if exists "Owners and members can remove card labels" on public.card_labels;
create policy "Owners and members can remove card labels"
  on public.card_labels for delete
  to authenticated
  using (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

-- attachments (card-scoped)
drop policy if exists "Members can view attachments" on public.attachments;
create policy "Members can view attachments"
  on public.attachments for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy if exists "Owners and members can add attachments" on public.attachments;
create policy "Owners and members can add attachments"
  on public.attachments for insert
  to authenticated
  with check (
    private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member')
    and uploaded_by = auth.uid()
  );

drop policy if exists "Uploaders and owners can delete attachments" on public.attachments;
create policy "Uploaders and owners can delete attachments"
  on public.attachments for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or private.current_workspace_role(private.card_workspace_id(card_id)) = 'owner'
  );

-- Private storage bucket + membership-gated policies. Path convention:
--   {workspace_id}/{card_id}/{uuid}-{original_filename}
-- so (storage.foldername(name))[1] is always the owning workspace id.
insert into storage.buckets (id, name, public)
values ('card-attachments', 'card-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Members can read card attachments" on storage.objects;
create policy "Members can read card attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'card-attachments'
    and private.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Members can upload card attachments" on storage.objects;
create policy "Members can upload card attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-attachments'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  );

drop policy if exists "Members can delete card attachments" on storage.objects;
create policy "Members can delete card attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-attachments'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  );

-- ============================================================================
-- Board banner images (Storage).
--
-- Boards already have a `background_url` column (initial_schema.sql). This adds a
-- Storage bucket to host uploaded banner images; the frontend writes the resulting
-- public URL into boards.background_url and renders it as the board tile banner and
-- the board page background.
--
-- The bucket is PUBLIC (read) so the dashboard can render banners via a plain public
-- URL without minting a signed URL per tile — banners are decorative, not sensitive.
-- Writes (upload/delete) are still gated to workspace members via the private.* RLS
-- helpers created above, so this must stay after them.
--
-- Path convention: {workspace_id}/{board_id}/{uuid}.{ext}
-- so (storage.foldername(name))[1] is always the owning workspace id.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('board-banners', 'board-banners', true)
on conflict (id) do update set public = true;

-- Public read is served directly from the public bucket; this policy additionally
-- lets authenticated members list/read via the authenticated API surface.
drop policy if exists "Anyone can read board banners" on storage.objects;
create policy "Anyone can read board banners"
  on storage.objects for select
  to public
  using (bucket_id = 'board-banners');

drop policy if exists "Members can upload board banners" on storage.objects;
create policy "Members can upload board banners"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'board-banners'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  );

drop policy if exists "Members can update board banners" on storage.objects;
create policy "Members can update board banners"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'board-banners'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  )
  with check (
    bucket_id = 'board-banners'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  );

drop policy if exists "Members can delete board banners" on storage.objects;
create policy "Members can delete board banners"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'board-banners'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  );

-- ============================================================================
-- Activity feed + per-user read state (powers the Inbox).
--
-- `activities` is an append-only log of workspace events (board created, card
-- created/moved/archived, comment added, …). It is workspace-scoped so the Inbox
-- can list tracks from every board in the workspace in one query.
--
-- `activity_reads` records, per (activity, user), that a user has read an item —
-- absence of a row means unread. This gives per-item read/unread plus a cheap
-- unread count, and lets each user's read state be independent.
--
-- RLS uses the private.* helpers created above, so this must stay after them.
-- ============================================================================

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  board_id uuid references public.boards (id) on delete set null,
  card_id uuid references public.cards (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activities_workspace_created_idx on public.activities (workspace_id, created_at desc);

create table if not exists public.activity_reads (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index if not exists activity_reads_user_idx on public.activity_reads (user_id);

alter table public.activities enable row level security;
alter table public.activity_reads enable row level security;

-- activities: any workspace member can read the feed; owners/members can log an
-- event, but only ever attributed to themselves.
drop policy if exists "Members can view activities" on public.activities;
create policy "Members can view activities"
  on public.activities for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Members can log activities" on public.activities;
create policy "Members can log activities"
  on public.activities for insert
  to authenticated
  with check (
    private.current_workspace_role(workspace_id) in ('owner', 'member')
    and actor_id = auth.uid()
  );

-- activity_reads: a user manages only their own read markers (read + unread).
drop policy if exists "Users can view their read markers" on public.activity_reads;
create policy "Users can view their read markers"
  on public.activity_reads for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can mark activities read" on public.activity_reads;
create policy "Users can mark activities read"
  on public.activity_reads for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can mark activities unread" on public.activity_reads;
create policy "Users can mark activities unread"
  on public.activity_reads for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Workspace invitations + membership-management RPCs (prd.md 3.1: "Ability to
-- invite members to a Workspace via email").
--
-- Invitations use an explicit accept/decline flow: an owner creates a pending
-- invite for an email address (whether or not that address has an account yet),
-- and the invitee later accepts or declines it themselves — joining only on
-- accept. Role changes, member removal, and leaving a workspace go through direct
-- table writes gated by the workspace_members RLS above. This section adds the
-- pieces those policies can't express, so it must stay after the private.* helpers:
--
--   * list_workspace_members  — read a workspace's members WITH their email
--       (auth.users isn't readable by `authenticated`, so SECURITY DEFINER);
--       gated to members of the workspace.
--   * workspace_invitations   — pending email invites; an owner-managed table.
--   * invite_to_workspace     — owner-only. Queue a pending invite for an email
--       (unless that user is already a member).
--   * list_my_invitations     — invites addressed to the caller (by email), with
--       workspace + inviter info, so the invitee can see them before joining.
--   * accept_invitation / decline_invitation — the invitee joins (or discards) an
--       invite addressed to their own email.
-- ============================================================================

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists workspace_invitations_email_idx on public.workspace_invitations (email);

alter table public.workspace_invitations enable row level security;

-- Members can see a workspace's pending invites (to display/manage them); only
-- owners may revoke (delete). Inserts happen exclusively through
-- invite_to_workspace (SECURITY DEFINER), so no INSERT policy is granted here.
drop policy if exists "Members can view invitations" on public.workspace_invitations;
create policy "Members can view invitations"
  on public.workspace_invitations for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Owners can revoke invitations" on public.workspace_invitations;
create policy "Owners can revoke invitations"
  on public.workspace_invitations for delete
  to authenticated
  using (private.current_workspace_role(workspace_id) = 'owner');

-- List members with their email + profile. SECURITY DEFINER so it can read
-- auth.users; gated so only members of the workspace can call it for that workspace.
create or replace function public.list_workspace_members(p_workspace_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  role public.workspace_role,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path to ''
as $$
begin
  if not private.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of this workspace' using errcode = '42501';
  end if;

  return query
    select m.user_id,
           u.email::text,
           p.display_name,
           p.avatar_url,
           m.role,
           m.created_at
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.workspace_id = p_workspace_id
    order by m.created_at asc;
end;
$$;

-- Owner-only. Queue a pending invite for an email address (both existing users
-- and not-yet-registered addresses). Returns a jsonb status: 'invited' |
-- 'already_member'. The invitee joins only when they accept (accept_invitation).
create or replace function public.invite_to_workspace(
  p_workspace_id uuid,
  p_email text,
  p_role public.workspace_role default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(nullif(btrim(p_email), ''));
  v_target uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if private.current_workspace_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'Only workspace owners can invite members' using errcode = '42501';
  end if;
  if v_email is null then
    raise exception 'Email is required' using errcode = '23514';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address' using errcode = '23514';
  end if;

  -- If that email already belongs to a workspace member, there's nothing to do.
  select id into v_target from auth.users where lower(email) = v_email limit 1;
  if v_target is not null and exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = v_target
  ) then
    return jsonb_build_object('status', 'already_member');
  end if;

  insert into public.workspace_invitations (workspace_id, email, role, invited_by)
  values (p_workspace_id, v_email, p_role, v_uid)
  on conflict (workspace_id, email)
  do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now();

  return jsonb_build_object('status', 'invited');
end;
$$;

-- Invitations addressed to the current user (matched by their auth.users email),
-- with workspace + inviter display info. SECURITY DEFINER because the invitee is
-- not yet a member and so can't read the workspace (or its invites) via RLS.
create or replace function public.list_my_invitations()
returns table (
  id uuid,
  workspace_id uuid,
  workspace_name text,
  role public.workspace_role,
  invited_by_name text,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path to ''
as $$
declare
  v_email text;
begin
  -- Alias auth.users so the `id` reference is qualified: this function's
  -- RETURNS TABLE column `id` is an in-scope variable, so a bare `id` here is
  -- ambiguous ("column reference id is ambiguous").
  select lower(au.email) into v_email from auth.users au where au.id = auth.uid();
  if v_email is null then
    return;
  end if;

  return query
    select i.id,
           i.workspace_id,
           w.name,
           i.role,
           coalesce(p.display_name, u.email::text),
           i.created_at
    from public.workspace_invitations i
    join public.workspaces w on w.id = i.workspace_id
    left join auth.users u on u.id = i.invited_by
    left join public.profiles p on p.id = i.invited_by
    where i.email = v_email
    order by i.created_at desc;
end;
$$;

-- Accept an invitation addressed to the current user: join the workspace, then
-- delete the invite. Returns the joined workspace id (null if it no longer exists).
create or replace function public.accept_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.workspace_invitations;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;

  select * into v_inv from public.workspace_invitations where id = p_invitation_id;
  if v_inv.id is null then
    return null; -- already accepted/declined/revoked
  end if;
  if v_inv.email is distinct from v_email then
    raise exception 'This invitation is not addressed to you' using errcode = '42501';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role)
  on conflict (workspace_id, user_id) do nothing;

  delete from public.workspace_invitations where id = p_invitation_id;

  return v_inv.workspace_id;
end;
$$;

-- Decline (delete) an invitation addressed to the current user.
create or replace function public.decline_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_email text;
  v_inv_email text;
begin
  select lower(email) into v_email from auth.users where id = auth.uid();
  select email into v_inv_email from public.workspace_invitations where id = p_invitation_id;
  if v_inv_email is null then
    return; -- already gone
  end if;
  if v_inv_email is distinct from v_email then
    raise exception 'This invitation is not addressed to you' using errcode = '42501';
  end if;
  delete from public.workspace_invitations where id = p_invitation_id;
end;
$$;

-- Reachable only by signed-in users, never the anon/public role.
revoke execute on function public.list_workspace_members(uuid) from public, anon;
grant execute on function public.list_workspace_members(uuid) to authenticated;

revoke execute on function public.invite_to_workspace(uuid, text, public.workspace_role) from public, anon;
grant execute on function public.invite_to_workspace(uuid, text, public.workspace_role) to authenticated;

revoke execute on function public.list_my_invitations() from public, anon;
grant execute on function public.list_my_invitations() to authenticated;

revoke execute on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

revoke execute on function public.decline_invitation(uuid) from public, anon;
grant execute on function public.decline_invitation(uuid) to authenticated;

-- ============================================================================
-- User avatars (Storage).
--
-- profiles.avatar_url (initial_schema.sql) holds each user's avatar URL. This adds
-- a PUBLIC bucket to host uploaded avatar images; the frontend writes the public
-- URL into profiles.avatar_url (a user may update their own profile row per the
-- rls_policies.sql "Users can update their own profile" policy).
--
-- Path convention: {user_id}/{uuid}.{ext} so (storage.foldername(name))[1] is the
-- owner's uid — a user may only write under their own folder.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read avatars" on storage.objects;
create policy "Anyone can read avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Realtime: add the tables the frontend subscribes to (BoardDataContext) to the
-- `supabase_realtime` publication so Postgres emits change events. Realtime
-- still enforces RLS on delivery, so a client only receives changes for rows it
-- can read. Idempotent — `alter publication ... add table` errors if the table
-- is already a member, so each add is guarded.
--   * lists, cards  — live board sync (per open board)
--   * activities    — live Inbox feed
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lists'
  ) then
    alter publication supabase_realtime add table public.lists;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cards'
  ) then
    alter publication supabase_realtime add table public.cards;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activities'
  ) then
    alter publication supabase_realtime add table public.activities;
  end if;
end $$;
