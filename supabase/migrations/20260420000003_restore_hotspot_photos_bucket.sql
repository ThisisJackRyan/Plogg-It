-- Recreate the `hotspot-photos` storage bucket after it was deleted out-of-band.
-- Policies on storage.objects from 20260418000004_clerk.sql still exist; we only
-- need to reinsert the bucket row.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hotspot-photos',
  'hotspot-photos',
  true,
  5 * 1024 * 1024,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
