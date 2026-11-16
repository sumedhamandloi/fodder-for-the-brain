-- Milestone 4: Little Library: saved ideas
create table if not exists public.saved_ideas (
  user_id uuid not null references auth.users on delete cascade,
  content_id text not null check (char_length(content_id) <= 80),
  saved_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

alter table public.saved_ideas enable row level security;
drop policy if exists "own rows" on public.saved_ideas;
create policy "own rows" on public.saved_ideas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
