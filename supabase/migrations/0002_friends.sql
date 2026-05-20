-- =============================================================================
-- 0002_friends.sql — Sistem zahtjeva i prijateljstava
-- =============================================================================

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  -- jedan aktivan zahtjev po paru (smjer)
  unique (from_user, to_user)
);

create index if not exists friend_requests_to_status_idx
  on public.friend_requests (to_user, status, created_at desc);

create table if not exists public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  -- Kanonički poredak — user_a uvijek "manji" id, eliminiše duplikate.
  check (user_a < user_b)
);

create index if not exists friendships_user_a_idx on public.friendships (user_a);
create index if not exists friendships_user_b_idx on public.friendships (user_b);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

-- Friend requests: vidiš svoj poslat ili primljen zahtjev
drop policy if exists "friend_requests read involved" on public.friend_requests;
create policy "friend_requests read involved" on public.friend_requests
  for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

drop policy if exists "friend_requests insert own" on public.friend_requests;
create policy "friend_requests insert own" on public.friend_requests
  for insert to authenticated
  with check (auth.uid() = from_user and from_user <> to_user);

-- Update: pošiljaoc može da otkaže, primaoc može da prihvati/odbije
drop policy if exists "friend_requests update involved" on public.friend_requests;
create policy "friend_requests update involved" on public.friend_requests
  for update to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user)
  with check (auth.uid() = from_user or auth.uid() = to_user);

drop policy if exists "friend_requests delete sender" on public.friend_requests;
create policy "friend_requests delete sender" on public.friend_requests
  for delete to authenticated
  using (auth.uid() = from_user);

-- Friendships: čitaš samo gdje učestvuješ
drop policy if exists "friendships read involved" on public.friendships;
create policy "friendships read involved" on public.friendships
  for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Insert/delete idu kroz security definer RPC funkcije ispod.
drop policy if exists "friendships delete involved" on public.friendships;
create policy "friendships delete involved" on public.friendships
  for delete to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- =============================================================================
-- accept_friend_request — atomski accept + insert u friendships
-- =============================================================================

create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.friend_requests;
  v_uid uuid := auth.uid();
  v_a uuid;
  v_b uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  select * into v_request
  from public.friend_requests
  where id = p_request_id;

  if not found then
    raise exception 'request_not_found';
  end if;

  if v_request.to_user <> v_uid then
    raise exception 'not_recipient';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'request_not_pending';
  end if;

  update public.friend_requests
     set status = 'accepted', responded_at = now()
   where id = p_request_id;

  if v_request.from_user < v_request.to_user then
    v_a := v_request.from_user;
    v_b := v_request.to_user;
  else
    v_a := v_request.to_user;
    v_b := v_request.from_user;
  end if;

  insert into public.friendships (user_a, user_b)
  values (v_a, v_b)
  on conflict do nothing;
end;
$$;
