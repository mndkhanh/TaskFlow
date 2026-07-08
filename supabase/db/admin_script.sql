-- Admin access control for the www/admin-dashboard app.
--
-- A user is an "admin" iff they have a row in public.admins. Membership can
-- only be granted out-of-band (service_role / SQL editor) — authenticated
-- users may read their OWN row (to self-check in the client) but have no
-- insert/update/delete policy, so admin status can NOT be self-granted.
--
-- This is why admin is NOT a column on public.profiles: profiles carries a
-- self-update policy (users can update their own profile), which would let a
-- user flip their own is_admin flag. A separate, write-locked table closes that.

create schema if not exists private;

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- A user may check whether *they* are an admin — and see nothing else.
drop policy if exists "Users can read their own admin row" on public.admins;
create policy "Users can read their own admin row"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- Deliberately NO insert/update/delete policies: only service_role (which
-- bypasses RLS) or a direct SQL grant can add an admin.

-- Helper for gating future admin-only RPCs. Lives in the non-exposed `private`
-- schema (see harden_functions.sql) so it is never reachable as a public REST
-- endpoint. search_path is pinned per the project's hardening convention.
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;


-- Instance-wide data for the www/admin-dashboard app.
--
-- The anon/authenticated client is RLS-scoped to a single user's own
-- workspaces, so it can't read across the instance. This SECURITY DEFINER RPC
-- runs as the function owner (bypassing RLS) but gates on private.is_admin()
-- first, so only rows in public.admins can call it — same public-RPC +
-- internal-gate pattern as the workspace-invitation RPCs. It also reads
-- auth.users (owner emails / signup status), which authenticated cannot.
--
-- Returns one JSON blob (single round-trip) shaped for the dashboard:
--   { stats: [{key,label,value,delta,spark[7]}...],
--     activity: [{day,cards,comments} x7],
--     workspaces: [{name,owner,members,boards,cards,created}...],
--     recentUsers: [{name,email,joined,status}...] }
-- deltas compare the last 7 days vs the prior 7; sparks are daily new-row
-- counts across the last 7 days.

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  with days as (
    select (current_date - offs)::date as d
    from generate_series(6, 0, -1) as offs
  )
  select jsonb_build_object(
    'stats', jsonb_build_array(
      private._admin_stat('workspaces', 'Workspaces'),
      private._admin_stat('boards', 'Boards'),
      private._admin_stat('users', 'Users'),
      private._admin_stat('cards', 'Cards')
    ),
    'activity', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'day', to_char(days.d, 'Dy'),
          'cards', (select count(*) from public.cards c where c.created_at::date = days.d),
          'comments', (select count(*) from public.comments cm where cm.created_at::date = days.d)
        ) order by days.d
      ), '[]'::jsonb)
      from days
    ),
    'workspaces', (
      select coalesce(jsonb_agg(jb order by mc desc), '[]'::jsonb)
      from (
        select
          jsonb_build_object(
            'name', w.name,
            'owner', coalesce(nullif(p.display_name, ''), u.email, 'Unknown'),
            'members', (select count(*) from public.workspace_members wm where wm.workspace_id = w.id),
            'boards', (select count(*) from public.boards b where b.workspace_id = w.id),
            'cards', (
              select count(*)
              from public.cards c
              join public.lists l on l.id = c.list_id
              join public.boards b on b.id = l.board_id
              where b.workspace_id = w.id
            ),
            'created', w.created_at
          ) as jb,
          (select count(*) from public.workspace_members wm where wm.workspace_id = w.id) as mc
        from public.workspaces w
        left join public.profiles p on p.id = w.created_by
        left join auth.users u on u.id = w.created_by
        order by mc desc
        limit 8
      ) z
    ),
    'recentUsers', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'name', coalesce(nullif(p.display_name, ''), split_part(u.email, '@', 1)),
          'email', u.email,
          'joined', u.created_at,
          'status', case
            when u.banned_until is not null and u.banned_until > now() then 'suspended'
            when u.email_confirmed_at is null then 'invited'
            else 'active'
          end
        ) order by u.created_at desc
      ), '[]'::jsonb)
      from (
        select id, email, created_at, email_confirmed_at, banned_until
        from auth.users
        order by created_at desc
        limit 6
      ) u
      left join public.profiles p on p.id = u.id
    )
  ) into result;

  return result;
end;
$$;

-- Per-KPI helper: total, 7d-vs-prior-7d delta %, and a 7-day daily sparkline.
-- Kept in `private` (not exposed as its own REST endpoint); the entity name is
-- validated against a fixed allowlist so the dynamic SQL can't be abused.
create or replace function private._admin_stat(entity text, label text)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  tbl text;
  total bigint;
  cur bigint;
  prev bigint;
  spark jsonb;
begin
  tbl := case entity
    when 'workspaces' then 'public.workspaces'
    when 'boards' then 'public.boards'
    when 'users' then 'public.profiles'
    when 'cards' then 'public.cards'
    else null
  end;
  if tbl is null then
    raise exception 'unknown entity %', entity;
  end if;

  execute format('select count(*) from %s', tbl) into total;
  execute format(
    'select count(*) from %s where created_at >= now() - interval ''7 days''', tbl
  ) into cur;
  execute format(
    'select count(*) from %s where created_at >= now() - interval ''14 days''
       and created_at < now() - interval ''7 days''', tbl
  ) into prev;
  execute format(
    $q$
      select coalesce(jsonb_agg(cnt order by d), '[]'::jsonb)
      from (
        select gs.d, count(t.created_at) as cnt
        from generate_series(current_date - 6, current_date, interval '1 day') as gs(d)
        left join %s t on t.created_at::date = gs.d::date
        group by gs.d
      ) s
    $q$, tbl
  ) into spark;

  return jsonb_build_object(
    'key', entity,
    'label', label,
    'value', total,
    'delta', case when prev = 0 then 0
                  else round(((cur - prev)::numeric / prev) * 100, 1) end,
    'spark', spark
  );
end;
$$;

-- admin_dashboard is the only client-facing entry point; _admin_stat lives in
-- the non-exposed `private` schema and is reached only via the definer call above.
revoke all on function public.admin_dashboard() from anon, public;
grant execute on function public.admin_dashboard() to authenticated, service_role;
