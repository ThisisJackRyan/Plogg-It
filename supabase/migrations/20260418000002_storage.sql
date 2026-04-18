-- Storage bucket for hotspot photos.
-- Public read, authenticated insert scoped to `hotspots/{auth.uid()}/...`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hotspot-photos',
  'hotspot-photos',
  true,
  5 * 1024 * 1024, -- 5 MB hard cap; app-side compressor targets ~500 KB
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies on storage.objects
drop policy if exists "hotspot-photos public read"    on storage.objects;
drop policy if exists "hotspot-photos owner insert"   on storage.objects;
drop policy if exists "hotspot-photos owner update"   on storage.objects;
drop policy if exists "hotspot-photos owner delete"   on storage.objects;

create policy "hotspot-photos public read"
  on storage.objects for select
  using (bucket_id = 'hotspot-photos');

create policy "hotspot-photos owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hotspot-photos'
    and (storage.foldername(name))[1] = 'hotspots'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "hotspot-photos owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'hotspot-photos'
    and (storage.foldername(name))[1] = 'hotspots'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "hotspot-photos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hotspot-photos'
    and (storage.foldername(name))[1] = 'hotspots'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
