-- =============================================================================
-- 0003_scores.sql — Gejmifikacija (dnevni skor + leaderboard)
-- =============================================================================

create table if not exists public.daily_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- kalorijska preciznost
  budget_kcal int,
  consumed_kcal int,
  calorie_precision_points int not null default 0,
  -- strik
  meals_logged_count int not null default 0,
  streak_qualifies boolean not null default false,
  current_streak int not null default 0,
  -- zdravi poeni
  protein_goal_g numeric,
  protein_consumed_g numeric,
  protein_goal_hit boolean not null default false,
  fiber_consumed_g numeric,
  trained boolean not null default false,
  healthy_points int not null default 0,
  -- ukupno
  total_points int not null default 0,
  computed_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists daily_scores_user_date_desc
  on public.daily_scores (user_id, date desc);

alter table public.daily_scores enable row level security;

-- Pisanje samo svoje (preko aplikacije ili RPC-a)
drop policy if exists "daily_scores write own" on public.daily_scores;
create policy "daily_scores write own" on public.daily_scores
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Čitanje: svoji + prijatelji (preko friendships).
drop policy if exists "daily_scores read self or friends" on public.daily_scores;
create policy "daily_scores read self or friends" on public.daily_scores
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where (f.user_a = auth.uid() and f.user_b = daily_scores.user_id)
         or (f.user_b = auth.uid() and f.user_a = daily_scores.user_id)
    )
  );
