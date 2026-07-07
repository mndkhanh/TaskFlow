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
-- helpers created in harden_functions.sql, so this must be applied after that file.
--
-- Path convention: {workspace_id}/{board_id}/{uuid}.{ext}
-- so (storage.foldername(name))[1] is always the owning workspace id.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('board-banners', 'board-banners', true)
on conflict (id) do update set public = true;

-- Public read is served directly from the public bucket; this policy additionally
-- lets authenticated members list/read via the authenticated API surface.
create policy "Anyone can read board banners"
  on storage.objects for select
  to public
  using (bucket_id = 'board-banners');

create policy "Members can upload board banners"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'board-banners'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  );

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

create policy "Members can delete board banners"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'board-banners'
    and private.current_workspace_role(((storage.foldername(name))[1])::uuid) in ('owner', 'member')
  );
