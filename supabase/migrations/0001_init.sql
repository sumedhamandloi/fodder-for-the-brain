-- Fodder for the Brain: initial schema (Milestones 2 and 3)
-- Every user-owned table is protected by Row Level Security: a user can only ever see and change their own rows.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  interests text[] not null default '{}',
  preferred_depth text not null default 'medium' check (preferred_depth in ('short', 'medium', 'deep')),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.avatars (
  user_id uuid primary key references auth.users on delete cascade,
  config jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  species text not null check (species in ('frog', 'cat', 'dog', 'rabbit', 'duck', 'hedgehog')),
  name text not null check (char_length(name) between 1 and 24),
  color_variant text not null default 'default',
  adopted_at timestamptz not null default now(),
  last_interaction_at timestamptz
  -- deliberately no hunger / affection columns: pets never decay
);
create index if not exists pets_user_idx on public.pets (user_id);

create table if not exists public.atmosphere_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  time_mode text not null default 'auto' check (time_mode in ('auto', 'manual')),
  time_phase text not null default 'afternoon',
  reduced_motion boolean not null default false,
  sound boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Row Level Security ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.avatars enable row level security;
alter table public.pets enable row level security;
alter table public.atmosphere_prefs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'avatars', 'pets', 'atmosphere_prefs'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t);
  end loop;
end $$;

-- A profile row appears automatically when someone signs up ----------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
