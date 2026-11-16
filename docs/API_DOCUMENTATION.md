# API Documentation (FastAPI). Draft

Base: `/api/v1`. Auth: Supabase JWT in `Authorization: Bearer`. User-owned CRUD goes straight to Supabase with RLS. This API covers only things that need secrets or third-party calls.

| Method | Path | Purpose | Milestone |
|---|---|---|---|
| GET | `/health` | liveness | 2 |
| POST | `/atmosphere/weather` | body `{lat, lon}` rounded to 0.1° → `{state, code, expires_at}`. Coordinates are discarded after the call. | 7 |
| GET | `/content/daily` | today's curated curiosity (deterministic per date) | 8 |
| GET | `/content/{id}` | a single item with its sources | 8 |
| GET | `/content?topic=&depth=` | paginated (fixed page size, **no infinite scroll**) | 8 |
| POST | `/curiosity/curate` | `{topics, depth, mood}` → at most 3 suggestions | 9 |
| POST | `/curiosity/lens` | `{content_id, mode: simple/analogy/short/deep/questions}` → transformed text plus citations | 9 |
| POST | `/curiosity/follow` | `{concept}` → exactly 3 related directions | 9 |

Without an AI key, each `/curiosity/*` endpoint falls back to curated metadata (`related` links, pre-written lenses) and sets `{ "source": "curated" }`.
