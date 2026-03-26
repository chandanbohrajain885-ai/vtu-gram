-- Run this in Supabase SQL Editor

-- Allow anyone to view avatars (public read)
create policy "avatars: public read"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
create policy "avatars: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'avatars' );

-- Allow authenticated users to update (overwrite) their own avatar
create policy "avatars: authenticated update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'avatars' );
