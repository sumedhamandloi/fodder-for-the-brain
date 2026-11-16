# Database Schema (Supabase / Postgres). Draft, implemented from Milestone 2

All tables: `user_id uuid references auth.users not null`, plus RLS `using (user_id = auth.uid())` for select, insert, update and delete.

```sql
profiles        (user_id pk, display_name text, created_at, onboarding_done bool,
                 interests text[], preferred_depth text check in ('short','medium','deep'))

avatars         (user_id pk, config jsonb not null, updated_at)
                 -- config: {skin, hairStyle, hairColor, eyes, outfit, outfitColor,
                 --          accessory, shoes, hat, backpack}  (validated by a version field)

pets            (id pk, user_id, species text check in ('frog','cat','dog','rabbit','duck','hedgehog'),
                 name text, color_variant text, adopted_at, last_interaction_at)  -- no hunger/affection columns

garden_plots    (id pk, user_id, x int, y int, crop text null, planted_at timestamptz null,
                 last_watered_at timestamptz null, harvested_count int default 0)

inventory_items (id pk, user_id, item_key text, qty int check (qty >= 0))

garden_objects  (id pk, user_id, object_key text, x int, y int, variant text)   -- decor placement

atmosphere_prefs(user_id pk, season_mode text, season text, time_mode text, time_phase text,
                 weather_mode text, weather text, reduced_motion bool, sound bool)
                 -- mode ∈ ('auto','random','manual')

weather_cache   (user_id pk, weather_code int, fetched_at, expires_at)   -- NO coordinates

saved_ideas     (id pk, user_id, content_id text, note text, saved_at)

journal_entries (id pk, user_id, body text, created_at, ai_consent bool default false)

game_progress   (id pk, user_id, game_key text, puzzle_id text, completed_at)  -- private, no scores ranked
```

Content (shared, read-only to users):
```sql
content_items   (id pk, kind text, topic text, depth text, title, body_md, sources jsonb, related text[])
content_embeddings (content_id fk, embedding vector(1536))   -- pgvector, added when needed
```
