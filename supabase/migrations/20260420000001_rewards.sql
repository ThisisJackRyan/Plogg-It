-- Rewards marketplace: brand gift cards users can redeem with points.

create table if not exists public.rewards (
    id uuid primary key default gen_random_uuid(),
    brand text not null,
    title text not null,
    description text,
    image_url text,
    accent_color text,
    cost_points integer not null check (cost_points > 0),
    face_value_cents integer,
    currency text not null default 'USD',
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.rewards enable row level security;

drop policy if exists "Rewards are viewable by everyone" on public.rewards;
create policy "Rewards are viewable by everyone"
    on public.rewards for select
    using ( true );

create table if not exists public.redemptions (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.profiles(id) on delete cascade,
    reward_id uuid not null references public.rewards(id) on delete restrict,
    cost_points integer not null,
    status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
    code text,
    created_at timestamptz not null default now()
);

create index if not exists redemptions_user_id_idx
    on public.redemptions(user_id, created_at desc);

alter table public.redemptions enable row level security;

drop policy if exists "Users can view their own redemptions" on public.redemptions;
create policy "Users can view their own redemptions"
    on public.redemptions for select
    using ( (auth.jwt()->>'sub') = user_id );

-- Atomic redemption: verify balance, insert redemption + negative ledger row.
create or replace function public.redeem_reward(p_reward_id uuid)
returns public.redemptions as $$
declare
    v_user_id text;
    v_reward public.rewards;
    v_balance integer;
    v_redemption public.redemptions;
begin
    v_user_id := auth.jwt()->>'sub';
    if v_user_id is null then
        raise exception 'unauthorized';
    end if;

    select * into v_reward from public.rewards where id = p_reward_id and active = true;
    if not found then
        raise exception 'reward_not_available';
    end if;

    select coalesce(total_points, 0) into v_balance
        from public.user_stats where id = v_user_id;
    if v_balance is null or v_balance < v_reward.cost_points then
        raise exception 'insufficient_points';
    end if;

    insert into public.redemptions (user_id, reward_id, cost_points)
        values (v_user_id, p_reward_id, v_reward.cost_points)
        returning * into v_redemption;

    insert into public.point_ledger (user_id, amount, reason, reference_id)
        values (v_user_id, -v_reward.cost_points, 'reward_redeemed', v_redemption.id);

    return v_redemption;
end;
$$ language plpgsql security definer;

grant execute on function public.redeem_reward(uuid) to anon, authenticated;

-- Seed popular brand gift cards. Idempotent via unique (brand, title, cost_points).
create unique index if not exists rewards_seed_unique_idx
    on public.rewards (brand, title, cost_points);

insert into public.rewards
    (brand, title, description, image_url, accent_color, cost_points, face_value_cents, sort_order)
values
    ('Starbucks', '$5 Starbucks Gift Card', 'Fuel your next cleanup walk with a coffee on us.',
        'https://logo.clearbit.com/starbucks.com', '#006241', 500, 500, 10),
    ('Starbucks', '$15 Starbucks Gift Card', 'A week of coffee runs — earned one pin at a time.',
        'https://logo.clearbit.com/starbucks.com', '#006241', 1400, 1500, 11),
    ('Amazon', '$10 Amazon Gift Card', 'Spend it on anything from trash grabbers to trail shoes.',
        'https://logo.clearbit.com/amazon.com', '#FF9900', 950, 1000, 20),
    ('Amazon', '$25 Amazon Gift Card', 'Stock up on cleanup gear — gloves, bags, and more.',
        'https://logo.clearbit.com/amazon.com', '#FF9900', 2300, 2500, 21),
    ('Target', '$10 Target Gift Card', 'Everyday essentials, on the house.',
        'https://logo.clearbit.com/target.com', '#CC0000', 950, 1000, 30),
    ('Chipotle', '$15 Chipotle Gift Card', 'Post-plog burrito. You earned it.',
        'https://logo.clearbit.com/chipotle.com', '#A81612', 1400, 1500, 40),
    ('Nike', '$25 Nike Gift Card', 'Upgrade your running kit.',
        'https://logo.clearbit.com/nike.com', '#111111', 2400, 2500, 50),
    ('Uber', '$15 Uber Gift Card', 'Good for rides or Uber Eats.',
        'https://logo.clearbit.com/uber.com', '#000000', 1400, 1500, 60),
    ('DoorDash', '$20 DoorDash Gift Card', 'Dinner delivered — no cooking after a long cleanup.',
        'https://logo.clearbit.com/doordash.com', '#FF3008', 1900, 2000, 70),
    ('Apple', '$25 Apple Gift Card', 'Apps, music, iCloud storage — your call.',
        'https://logo.clearbit.com/apple.com', '#000000', 2400, 2500, 80),
    ('Spotify', '$10 Spotify Gift Card', 'A month of Premium for your cleanup playlists.',
        'https://logo.clearbit.com/spotify.com', '#1DB954', 950, 1000, 90),
    ('REI', '$25 REI Gift Card', 'Gear up for your next outdoor adventure.',
        'https://logo.clearbit.com/rei.com', '#00563F', 2400, 2500, 100),
    ('Patagonia', '$50 Patagonia Gift Card', 'Built to last — like the habits you are forming.',
        'https://logo.clearbit.com/patagonia.com', '#1F2A44', 4800, 5000, 110),
    ('Whole Foods', '$20 Whole Foods Gift Card', 'Healthy fuel for an active plogger.',
        'https://logo.clearbit.com/wholefoodsmarket.com', '#00674B', 1900, 2000, 120),
    ('Lululemon', '$50 Lululemon Gift Card', 'Workout gear that breathes.',
        'https://logo.clearbit.com/lululemon.com', '#C8102E', 4800, 5000, 130)
on conflict (brand, title, cost_points) do nothing;
