-- Keep updated_at current on row changes

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.boards
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.lists
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.cards
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.checklists
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- Auto-provision a profile + default personal workspace for every new user (prd.md 3.1)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers used by RLS policies to resolve the owning workspace of nested rows

create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.current_workspace_role(_workspace_id uuid)
returns public.workspace_role
language sql
security definer
stable
as $$
  select role from public.workspace_members
  where workspace_id = _workspace_id and user_id = auth.uid();
$$;

create or replace function public.board_workspace_id(_board_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select workspace_id from public.boards where id = _board_id;
$$;

create or replace function public.list_workspace_id(_list_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select b.workspace_id
  from public.lists l
  join public.boards b on b.id = l.board_id
  where l.id = _list_id;
$$;

create or replace function public.card_workspace_id(_card_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select b.workspace_id
  from public.cards c
  join public.lists l on l.id = c.list_id
  join public.boards b on b.id = l.board_id
  where c.id = _card_id;
$$;
