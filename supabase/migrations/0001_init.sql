-- =============================================================================
-- 0001_init.sql — Inicijalna shema FitnessApp + RLS politike + auth triggeri.
-- Pokreće se ručno preko Supabase SQL Editor-a ili `supabase db push`.
-- =============================================================================

-- Profiles (1:1 sa auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles using btree (lower(username));

-- User context (profil za AI: alergije, sport, godine, visina...)
create table if not exists public.user_context (
  user_id uuid primary key references auth.users (id) on delete cascade,
  allergies_or_avoid text,
  dietary_note text,
  age_years int check (age_years is null or (age_years between 1 and 120)),
  sex text,
  height_cm numeric,
  sport_note text,
  updated_at timestamptz not null default now()
);

-- Daily logs (jsonb za hranu i trening — model već piše ovaj format)
create table if not exists public.daily_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  food_items jsonb not null default '[]'::jsonb,
  cardio_sessions jsonb not null default '[]'::jsonb,
  strength_blocks jsonb not null default '[]'::jsonb,
  day_note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists daily_logs_user_date_desc on public.daily_logs (user_id, date desc);

-- Weight entries
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kg numeric not null check (kg > 0),
  goal_plan_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists weight_entries_user_date_desc on public.weight_entries (user_id, date desc);

-- Goal plans
create table if not exists public.goal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  program_type text not null,
  start_date date,
  target_daily_kcal int,
  target_protein_g numeric,
  target_carbs_g numeric,
  target_fat_g numeric,
  target_weekly_weight_delta_kg numeric,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists goal_plans_user_active_idx on public.goal_plans (user_id, is_active);

-- Samo jedan aktivni plan po useru
create unique index if not exists goal_plans_user_one_active
  on public.goal_plans (user_id)
  where is_active = true;

-- Weight goals
create table if not exists public.weight_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  start_kg numeric not null,
  target_kg numeric not null,
  sex text,
  age_years int,
  height_cm numeric,
  activity_level text,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- RLS — svaki korisnik vidi i piše samo svoje
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.user_context enable row level security;
alter table public.daily_logs enable row level security;
alter table public.weight_entries enable row level security;
alter table public.goal_plans enable row level security;
alter table public.weight_goals enable row level security;

-- Profiles: čitanje dozvoljeno svim autenticiranim (za search prijatelja),
-- pisanje samo nad svojim redom.
drop policy if exists "profiles read all authenticated" on public.profiles;
create policy "profiles read all authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- User context: samo svoj
drop policy if exists "user_context own" on public.user_context;
create policy "user_context own" on public.user_context
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily logs: samo svoji
drop policy if exists "daily_logs own" on public.daily_logs;
create policy "daily_logs own" on public.daily_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Weight entries: samo svoji
drop policy if exists "weight_entries own" on public.weight_entries;
create policy "weight_entries own" on public.weight_entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Goal plans: samo svoji
drop policy if exists "goal_plans own" on public.goal_plans;
create policy "goal_plans own" on public.goal_plans
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Weight goals: samo svoj
drop policy if exists "weight_goals own" on public.weight_goals;
create policy "weight_goals own" on public.weight_goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- handle_new_user — kreira profile red kada Auth napravi novog user-a.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_username text;
  v_username text;
  v_attempt int := 0;
begin
  v_base_username := coalesce(
    lower(regexp_replace(new.raw_user_meta_data->>'preferred_username', '[^a-z0-9_]+', '', 'g')),
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
  );
  if v_base_username = '' then
    v_base_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  v_username := v_base_username;
  loop
    begin
      insert into public.profiles (id, username, display_name, avatar_url)
      values (
        new.id,
        v_username,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
      );
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      v_username := v_base_username || '_' || v_attempt::text;
      if v_attempt > 10 then
        raise;
      end if;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
