-- Run in Supabase SQL Editor

alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists deleted_for_everyone boolean not null default false;
alter table public.messages add column if not exists deleted_for_sender boolean not null default false;
alter table public.messages add column if not exists deleted_for_receiver boolean not null default false;
alter table public.messages add column if not exists edited boolean not null default false;
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;
alter table public.messages add column if not exists forwarded_from uuid references public.messages(id) on delete set null;

-- Allow update (for edit, delete, read)
create policy "messages: own update"
  on public.messages for update
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
