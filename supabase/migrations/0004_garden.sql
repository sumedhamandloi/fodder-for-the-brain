-- Milestone 6: My Little Garden: decorations placed in your personal garden
create table if not exists public.garden_objects (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  object_key text not null check (char_length(object_key) <= 40),
  x int not null check (x between 0 and 2000),
  y int not null check (y between 0 and 2000),
  placed_at timestamptz not null default now()
);
create index if not exists garden_objects_user_idx on public.garden_objects (user_id);

alter table public.garden_objects enable row level security;
drop policy if exists "own rows" on public.garden_objects;
create policy "own rows" on public.garden_objects for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
