create table if not exists public.user_stats (
    id text primary key references public.profiles(id) on delete cascade,
    total_points integer not null default 0,
    current_streak integer not null default 0,
    longest_streak integer not null default 0,
    last_active_year_week text
);

alter table public.user_stats enable row level security;

create policy "User stats are viewable by everyone"
    on public.user_stats for select
    using ( true );

create policy "Users can update their own stats"
    on public.user_stats for update
    using ( (auth.jwt()->>'sub') = id );

create table if not exists public.point_ledger (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.profiles(id) on delete cascade,
    amount integer not null,
    reason text not null,
    reference_id uuid,
    created_at timestamptz not null default now()
);

alter table public.point_ledger enable row level security;

create policy "Users can view their own point ledger"
    on public.point_ledger for select
    using ( (auth.jwt()->>'sub') = user_id );

alter publication supabase_realtime add table public.point_ledger;

-- Insert default row when a profile is created
create or replace function public.handle_new_profile_stats()
returns trigger as $$
begin
    insert into public.user_stats (id)
    values (new.id)
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

create trigger on_new_profile_stats
    after insert on public.profiles
    for each row execute procedure public.handle_new_profile_stats();

-- Process point ledger inserts to update stats
create or replace function public.process_point_ledger_insert()
returns trigger as $$
declare
    v_current_year_week text;
    v_last_active text;
    v_current_streak integer;
begin
    v_current_year_week := to_char(new.created_at, 'IYYY-IW');

    select last_active_year_week, current_streak
    into v_last_active, v_current_streak
    from public.user_stats
    where id = new.user_id;

    if v_last_active is null or v_last_active < v_current_year_week then
        if v_last_active = to_char(new.created_at - interval '1 week', 'IYYY-IW') then
            -- Consecutive week
            v_current_streak := v_current_streak + 1;
        else
            -- Missed a week
            v_current_streak := 1;
        end if;
    elsif v_last_active = v_current_year_week then
        -- Same week, streak doesn't increase, but ensures it's at least 1 if it wasn't
        if v_current_streak = 0 then
            v_current_streak := 1;
        end if;
    end if;

    update public.user_stats
    set 
        total_points = total_points + new.amount,
        current_streak = v_current_streak,
        longest_streak = greatest(longest_streak, v_current_streak),
        last_active_year_week = v_current_year_week
    where id = new.user_id;

    return new;
end;
$$ language plpgsql security definer;

create trigger on_point_ledger_insert
    after insert on public.point_ledger
    for each row execute procedure public.process_point_ledger_insert();

-- Hotspot triggers
create or replace function public.award_hotspot_report_points()
returns trigger as $$
begin
    insert into public.point_ledger (user_id, amount, reason, reference_id)
    values (new.reported_by, 10, 'hotspot_reported', new.id);
    return new;
end;
$$ language plpgsql security definer;

create trigger after_hotspot_insert_points
    after insert on public.hotspots
    for each row execute procedure public.award_hotspot_report_points();

create or replace function public.award_hotspot_cleanup_points()
returns trigger as $$
begin
    if new.status = 'cleaned' and old.status = 'active' and new.cleaned_by is not null then
        insert into public.point_ledger (user_id, amount, reason, reference_id)
        values (new.cleaned_by, 20, 'hotspot_cleaned', new.id);
    end if;
    return new;
end;
$$ language plpgsql security definer;

create trigger after_hotspot_update_points
    after update on public.hotspots
    for each row execute procedure public.award_hotspot_cleanup_points();

-- Route trigger
create or replace function public.award_route_completion_points()
returns trigger as $$
begin
    if new.status = 'completed' and old.status = 'active' then
        insert into public.point_ledger (user_id, amount, reason, reference_id)
        values (new.user_id, 15, 'route_completed', new.id);
    end if;
    return new;
end;
$$ language plpgsql security definer;

create trigger after_route_update_points
    after update on public.routes
    for each row execute procedure public.award_route_completion_points();
