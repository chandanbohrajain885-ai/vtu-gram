-- ============================================================
-- VTU GRAM — Supabase Database Setup
-- Run this in your Supabase project: SQL Editor → New Query
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default 'student' check (role in ('student', 'super_admin')),
  usn         text,
  department  text,
  semester    int,
  year        int,
  subjects    text[] not null default '{}',
  is_approved boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2. CONTENT TABLE
create table if not exists public.content (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  department  text not null,
  semester    int not null,
  subject     text not null,
  chapter     text not null,
  type        text not null check (type in ('video', 'short', 'note', 'question_paper')),
  file_url    text not null,
  status      text not null default 'approved' check (status in ('approved', 'pending')),
  created_at  timestamptz not null default now()
);

-- 3. STUDENT NOTES TABLE
create table if not exists public.student_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject    text not null,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, subject)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.content        enable row level security;
alter table public.student_notes  enable row level security;

-- PROFILES: users can read/update their own row; service role can insert
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: insert on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

-- CONTENT: anyone authenticated can read approved content
create policy "content: authenticated read"
  on public.content for select
  to authenticated
  using (status = 'approved');

-- CONTENT: only super_admin can insert/update/delete
create policy "content: admin insert"
  on public.content for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

create policy "content: admin delete"
  on public.content for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- STUDENT NOTES: users can only access their own notes
create policy "notes: own select"
  on public.student_notes for select
  using (auth.uid() = user_id);

create policy "notes: own insert"
  on public.student_notes for insert
  with check (auth.uid() = user_id);

create policy "notes: own update"
  on public.student_notes for update
  using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard → Storage → New Bucket
-- OR run via the dashboard (SQL cannot create buckets directly)
-- ============================================================
-- Bucket name: videos   (public: true)
-- Bucket name: documents (public: true)

-- ============================================================
-- SUPER ADMIN SETUP
-- After creating your admin user via Supabase Auth dashboard,
-- run this with their UUID:
-- ============================================================
-- insert into public.profiles (id, name, role, subjects)
-- values ('<admin-user-uuid>', 'Admin', 'super_admin', '{}');
