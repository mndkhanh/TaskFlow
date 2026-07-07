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

drop policy "Members can view their workspaces" on public.workspaces;
create policy "Members can view their workspaces"
  on public.workspaces for select
  to authenticated
  using (private.is_workspace_member(id));

drop policy "Owners can update their workspace" on public.workspaces;
create policy "Owners can update their workspace"
  on public.workspaces for update
  to authenticated
  using (private.current_workspace_role(id) = 'owner')
  with check (private.current_workspace_role(id) = 'owner');

drop policy "Owners can delete their workspace" on public.workspaces;
create policy "Owners can delete their workspace"
  on public.workspaces for delete
  to authenticated
  using (private.current_workspace_role(id) = 'owner');

drop policy "Members can view workspace membership" on public.workspace_members;
create policy "Members can view workspace membership"
  on public.workspace_members for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy "Owners can add workspace members" on public.workspace_members;
create policy "Owners can add workspace members"
  on public.workspace_members for insert
  to authenticated
  with check (private.current_workspace_role(workspace_id) = 'owner');

drop policy "Owners can update member roles" on public.workspace_members;
create policy "Owners can update member roles"
  on public.workspace_members for update
  to authenticated
  using (private.current_workspace_role(workspace_id) = 'owner')
  with check (private.current_workspace_role(workspace_id) = 'owner');

drop policy "Owners can remove members, members can leave" on public.workspace_members;
create policy "Owners can remove members, members can leave"
  on public.workspace_members for delete
  to authenticated
  using (
    private.current_workspace_role(workspace_id) = 'owner'
    or user_id = auth.uid()
  );

drop policy "Members can view boards" on public.boards;
create policy "Members can view boards"
  on public.boards for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy "Owners and members can create boards" on public.boards;
create policy "Owners and members can create boards"
  on public.boards for insert
  to authenticated
  with check (private.current_workspace_role(workspace_id) in ('owner', 'member'));

drop policy "Owners and members can update boards" on public.boards;
create policy "Owners and members can update boards"
  on public.boards for update
  to authenticated
  using (private.current_workspace_role(workspace_id) in ('owner', 'member'))
  with check (private.current_workspace_role(workspace_id) in ('owner', 'member'));

drop policy "Owners and members can delete boards" on public.boards;
create policy "Owners and members can delete boards"
  on public.boards for delete
  to authenticated
  using (private.current_workspace_role(workspace_id) in ('owner', 'member'));

drop policy "Members can view lists" on public.lists;
create policy "Members can view lists"
  on public.lists for select
  to authenticated
  using (private.is_workspace_member(private.board_workspace_id(board_id)));

drop policy "Owners and members can create lists" on public.lists;
create policy "Owners and members can create lists"
  on public.lists for insert
  to authenticated
  with check (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy "Owners and members can update lists" on public.lists;
create policy "Owners and members can update lists"
  on public.lists for update
  to authenticated
  using (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'))
  with check (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy "Owners and members can delete lists" on public.lists;
create policy "Owners and members can delete lists"
  on public.lists for delete
  to authenticated
  using (private.current_workspace_role(private.board_workspace_id(board_id)) in ('owner', 'member'));

drop policy "Members can view cards" on public.cards;
create policy "Members can view cards"
  on public.cards for select
  to authenticated
  using (private.is_workspace_member(private.list_workspace_id(list_id)));

drop policy "Owners and members can create cards" on public.cards;
create policy "Owners and members can create cards"
  on public.cards for insert
  to authenticated
  with check (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'));

drop policy "Owners and members can update cards" on public.cards;
create policy "Owners and members can update cards"
  on public.cards for update
  to authenticated
  using (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'))
  with check (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'));

drop policy "Owners and members can delete cards" on public.cards;
create policy "Owners and members can delete cards"
  on public.cards for delete
  to authenticated
  using (private.current_workspace_role(private.list_workspace_id(list_id)) in ('owner', 'member'));

drop policy "Members can view card assignees" on public.card_assignees;
create policy "Members can view card assignees"
  on public.card_assignees for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy "Owners and members can assign cards" on public.card_assignees;
create policy "Owners and members can assign cards"
  on public.card_assignees for insert
  to authenticated
  with check (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy "Owners and members can unassign cards" on public.card_assignees;
create policy "Owners and members can unassign cards"
  on public.card_assignees for delete
  to authenticated
  using (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy "Members can view checklist items" on public.checklists;
create policy "Members can view checklist items"
  on public.checklists for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy "Owners and members can create checklist items" on public.checklists;
create policy "Owners and members can create checklist items"
  on public.checklists for insert
  to authenticated
  with check (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy "Owners and members can update checklist items" on public.checklists;
create policy "Owners and members can update checklist items"
  on public.checklists for update
  to authenticated
  using (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'))
  with check (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy "Owners and members can delete checklist items" on public.checklists;
create policy "Owners and members can delete checklist items"
  on public.checklists for delete
  to authenticated
  using (private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member'));

drop policy "Members can view comments" on public.comments;
create policy "Members can view comments"
  on public.comments for select
  to authenticated
  using (private.is_workspace_member(private.card_workspace_id(card_id)));

drop policy "Owners and members can post comments" on public.comments;
create policy "Owners and members can post comments"
  on public.comments for insert
  to authenticated
  with check (
    private.current_workspace_role(private.card_workspace_id(card_id)) in ('owner', 'member')
    and user_id = auth.uid()
  );

drop policy "Authors and owners can delete comments" on public.comments;
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
