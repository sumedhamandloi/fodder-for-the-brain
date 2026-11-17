-- Milestone 8: Farming: six plots in your little garden, and a basket of what you've grown.
-- Growth is computed from timestamps on read; nothing here can wilt or die.
create table if not exists public.garden_plots (
  user_id uuid not null references auth.users on delete cascade,
  plot int not null check (plot between 0 and 11),
  crop text check (crop in ('carrot','strawberry','sunflower','tomato','pumpkin','blueberry','lavender','tulip')),
  planted_at timestamptz,
  watered_at timestamptz,
  primary key (user_id, plot)
);

create table if not exists public.harvest_basket (
  user_id uuid not null references auth.users on delete cascade,
  crop text not null,
  qty int not null default 0 check (qty >= 0),
  primary key (user_id, crop)
);

alter table public.garden_plots enable row level security;
alter table public.harvest_basket enable row level security;
drop policy if exists "own rows" on public.garden_plots;
create policy "own rows" on public.garden_plots for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own rows" on public.harvest_basket;
create policy "own rows" on public.harvest_basket for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
