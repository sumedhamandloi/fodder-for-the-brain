-- Milestone 5: Pond & Dock: private journal and nature observations
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'journal' check (kind in ('journal', 'observation')),
  prompt text,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  -- journals are never sent to an AI unless this is explicitly set by the writer
  ai_consent boolean not null default false
);
create index if not exists journal_user_created_idx on public.journal_entries (user_id, created_at desc);

alter table public.journal_entries enable row level security;
drop policy if exists "own rows" on public.journal_entries;
create policy "own rows" on public.journal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
