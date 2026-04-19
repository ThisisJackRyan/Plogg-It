-- Grant table access for the rewards marketplace. RLS still enforces row filters.

grant select on public.rewards to anon, authenticated;
grant select, insert on public.redemptions to authenticated;
