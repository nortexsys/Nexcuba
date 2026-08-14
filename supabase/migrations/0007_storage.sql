-- 0007 · Storage buckets: media (public) + verification-docs (private).
-- Supabase-only objects; the guard makes this a no-op on plain Postgres (CI)
-- where the storage schema does not exist.

begin;

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not present (plain Postgres/CI): skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'media', 'media', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
  on conflict (id) do update
    set public = true,
        file_size_limit = 5242880,
        allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'verification-docs', 'verification-docs', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png']
  )
  on conflict (id) do update
    set public = false,
        file_size_limit = 10485760,
        allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

  -- media: everyone reads (public URLs); writes go through server actions.
  drop policy if exists "media public read" on storage.objects;
  create policy "media public read" on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'media');

  -- verification-docs: admin read only; signed URLs are issued server-side.
  drop policy if exists "verification-docs admin read" on storage.objects;
  create policy "verification-docs admin read" on storage.objects
    for select to authenticated
    using (bucket_id = 'verification-docs' and public.is_admin());
end
$$;

commit;
