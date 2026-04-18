-- Backfill profiles for any auth.users that don't have a matching row.
-- Handles: pre-existing users who signed up before the trigger was installed,
-- or any user whose trigger-fired insert was lost.

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
