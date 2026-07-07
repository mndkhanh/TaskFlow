-- Row Level Security: enforces Workspace-RBAC (owner / member / viewer) from prd.md 3.1
-- owner+member can write within a workspace; viewer is read-only.

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;
alter table public.card_assignees enable row level security;
alter table public.checklists enable row level security;
alter table public.comments enable row level security;

-- profiles

create policy "Profiles are viewable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- workspaces

create policy "Members can view their workspaces"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Owners can update their workspace"
  on public.workspaces for update
  to authenticated
  using (public.current_workspace_role(id) = 'owner')
  with check (public.current_workspace_role(id) = 'owner');

create policy "Owners can delete their workspace"
  on public.workspaces for delete
  to authenticated
  using (public.current_workspace_role(id) = 'owner');

-- workspace_members

create policy "Members can view workspace membership"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Owners can add workspace members"
  on public.workspace_members for insert
  to authenticated
  with check (public.current_workspace_role(workspace_id) = 'owner');

create policy "Owners can update member roles"
  on public.workspace_members for update
  to authenticated
  using (public.current_workspace_role(workspace_id) = 'owner')
  with check (public.current_workspace_role(workspace_id) = 'owner');

create policy "Owners can remove members, members can leave"
  on public.workspace_members for delete
  to authenticated
  using (
    public.current_workspace_role(workspace_id) = 'owner'
    or user_id = auth.uid()
  );

-- boards

create policy "Members can view boards"
  on public.boards for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Owners and members can create boards"
  on public.boards for insert
  to authenticated
  with check (public.current_workspace_role(workspace_id) in ('owner', 'member'));

create policy "Owners and members can update boards"
  on public.boards for update
  to authenticated
  using (public.current_workspace_role(workspace_id) in ('owner', 'member'))
  with check (public.current_workspace_role(workspace_id) in ('owner', 'member'));

create policy "Owners and members can delete boards"
  on public.boards for delete
  to authenticated
  using (public.current_workspace_role(workspace_id) in ('owner', 'member'));

-- lists

create policy "Members can view lists"
  on public.lists for select
  to authenticated
  using (public.is_workspace_member(public.board_workspace_id(board_id)));

create policy "Owners and members can create lists"
  on public.lists for insert
  to authenticated
  with check (public.current_workspace_role(public.board_workspace_id(board_id)) in ('owner', 'member'));

create policy "Owners and members can update lists"
  on public.lists for update
  to authenticated
  using (public.current_workspace_role(public.board_workspace_id(board_id)) in ('owner', 'member'))
  with check (public.current_workspace_role(public.board_workspace_id(board_id)) in ('owner', 'member'));

create policy "Owners and members can delete lists"
  on public.lists for delete
  to authenticated
  using (public.current_workspace_role(public.board_workspace_id(board_id)) in ('owner', 'member'));

-- cards

create policy "Members can view cards"
  on public.cards for select
  to authenticated
  using (public.is_workspace_member(public.list_workspace_id(list_id)));

create policy "Owners and members can create cards"
  on public.cards for insert
  to authenticated
  with check (public.current_workspace_role(public.list_workspace_id(list_id)) in ('owner', 'member'));

create policy "Owners and members can update cards"
  on public.cards for update
  to authenticated
  using (public.current_workspace_role(public.list_workspace_id(list_id)) in ('owner', 'member'))
  with check (public.current_workspace_role(public.list_workspace_id(list_id)) in ('owner', 'member'));

create policy "Owners and members can delete cards"
  on public.cards for delete
  to authenticated
  using (public.current_workspace_role(public.list_workspace_id(list_id)) in ('owner', 'member'));

-- card_assignees

create policy "Members can view card assignees"
  on public.card_assignees for select
  to authenticated
  using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "Owners and members can assign cards"
  on public.card_assignees for insert
  to authenticated
  with check (public.current_workspace_role(public.card_workspace_id(card_id)) in ('owner', 'member'));

create policy "Owners and members can unassign cards"
  on public.card_assignees for delete
  to authenticated
  using (public.current_workspace_role(public.card_workspace_id(card_id)) in ('owner', 'member'));

-- checklists

create policy "Members can view checklist items"
  on public.checklists for select
  to authenticated
  using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "Owners and members can create checklist items"
  on public.checklists for insert
  to authenticated
  with check (public.current_workspace_role(public.card_workspace_id(card_id)) in ('owner', 'member'));

create policy "Owners and members can update checklist items"
  on public.checklists for update
  to authenticated
  using (public.current_workspace_role(public.card_workspace_id(card_id)) in ('owner', 'member'))
  with check (public.current_workspace_role(public.card_workspace_id(card_id)) in ('owner', 'member'));

create policy "Owners and members can delete checklist items"
  on public.checklists for delete
  to authenticated
  using (public.current_workspace_role(public.card_workspace_id(card_id)) in ('owner', 'member'));

-- comments

create policy "Members can view comments"
  on public.comments for select
  to authenticated
  using (public.is_workspace_member(public.card_workspace_id(card_id)));

create policy "Owners and members can post comments"
  on public.comments for insert
  to authenticated
  with check (
    public.current_workspace_role(public.card_workspace_id(card_id)) in ('owner', 'member')
    and user_id = auth.uid()
  );

create policy "Authors can update their own comments"
  on public.comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Authors and owners can delete comments"
  on public.comments for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_workspace_role(public.card_workspace_id(card_id)) = 'owner'
  );
