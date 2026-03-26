-- Run in Supabase SQL Editor

-- FOLLOWS TABLE
create table if not exists public.follows (
  id          uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "follows: authenticated read"
  on public.follows for select
  to authenticated using (true);

create policy "follows: own insert"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "follows: own delete"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

-- MESSAGES TABLE
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages: participants read"
  on public.messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages: own insert"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);
