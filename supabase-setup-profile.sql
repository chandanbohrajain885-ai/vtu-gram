-- Run in Supabase SQL Editor

-- Add avatar_url column to profiles
alter table public.profiles add column if not exists avatar_url text;

-- Storage bucket for avatars (create manually in Storage dashboard)
-- Bucket name: avatars (public: true)

-- Allow authenticated users to upload to avatars bucket
-- Go to Storage → avatars → Policies → Add policy:
--   INSERT: authenticated users (with check: true)
--   SELECT: public (using: true)
