# Architecture

## Overview
```
┌──────────── Browser ─────────────────────────────────────────┐
│ React 18 + TS (Vite)                                          │
│  ├─ App shell, routing (react-router), overlays, reader, UI   │
│  ├─ GameHost  ── mounts ──►  Phaser 3 game (one instance)     │
│  │                ▲  event bus (typed)  ▼                     │
│  ├─ State: Zustand stores (atmosphere, player, ui)            │
│  └─ Data: supabase-js (auth, RLS-protected tables) + API calls│
└───────────────┬───────────────────────────────┬──────────────┘
                │                               │
        Supabase (Postgres, Auth,        FastAPI (Python 3.12)
        Storage, RLS, pgvector later)     ├─ /atmosphere/weather  (Open-Meteo proxy, coarse coords)
                                           ├─ /curiosity/*         (curator, lens, follow-the-thought)
                                           └─ /content/*           (curated content, retrieval)
```

### Key decisions
| Decision | Choice | Why |
|---|---|---|
| Phaser and React boundary | Phaser owns **only** the canvas world. React owns all text-heavy UI. They communicate over a **typed event bus** (`game/bus.ts`). | Keeps readable typography in the DOM and keeps the game loop free of React re-renders. |
| One Phaser instance | Scenes are swapped (`Boot`, `Preload`, `MainWorld`, `HomeGarden`, interiors). The game is never remounted. | Avoids WebGL context churn. |
| Maps | **Tiled JSON** format, loaded by Phaser's tilemap API. Collision lives in an object layer. | Industry standard and editable in Tiled. |
| Art source | Palette-indexed source files compiled by `tools/art/build.py` (see `DESIGN_SYSTEM.md`) | Enforces palette and size rules automatically. |
| State | Zustand | Small and works outside React (Phaser can read it) |
| Styling | CSS Modules plus tokens | The brief allows CSS Modules or Tailwind. Modules keep pixel UI components self-contained. |
| Persistence | Supabase directly from the client (RLS) for user-owned rows. FastAPI only for anything needing secrets or third-party calls. | Least server code, with security enforced by RLS. |
| Time-based growth | Stores timestamps only. Stage = f(now − planted_at, watered_at). It is computed on read, never by cron. | No decay or missed-tick bugs |
| Milestone 1 persistence | `localStorage` adapter behind a `SaveRepository` interface | Lets the prototype work offline before auth exists |

## Folder structure
```
fodder-for-the-brain/
├─ README.md
├─ design-references/            (read-only references)
├─ docs/                         (all spec and design documents)
├─ art-src/                      (palette + pixel sources, the source of truth for art)
│   ├─ palette.json
│   ├─ tiles/  sprites/  ui/
├─ tools/
│   └─ art/build.py              (compile + validate → frontend/public/assets)
├─ frontend/
│   ├─ index.html  vite.config.ts  tsconfig.json  package.json
│   ├─ public/assets/            (generated sheets, atlases, maps)
│   ├─ src/
│   │   ├─ main.tsx  App.tsx
│   │   ├─ app/                  (routes, layout, providers)
│   │   ├─ game/
│   │   │   ├─ config.ts         (480×270, pixelArt, integer zoom)
│   │   │   ├─ bus.ts            (typed events between React and Phaser)
│   │   │   ├─ scenes/           (Boot, Preload, MainWorld, …)
│   │   │   ├─ entities/         (Player, Pet, Npc, Building, Hotspot)
│   │   │   ├─ systems/          (Collision, YSort, Atmosphere, Interaction, Camera)
│   │   │   └─ data/             (map ids, hotspot definitions)
│   │   ├─ features/             (atmosphere/, places/, reader/ … one folder per feature)
│   │   ├─ ui/                   (PixelPanel, PixelButton, … design-system components)
│   │   ├─ state/                (zustand stores)
│   │   ├─ services/             (SaveRepository, supabase, api client)
│   │   └─ styles/               (tokens.css, fonts)
│   └─ tests/                    (Playwright e2e + visual snapshots)
├─ backend/
│   ├─ pyproject.toml
│   ├─ app/
│   │   ├─ main.py  config.py
│   │   ├─ routers/              (atmosphere, curiosity, content)
│   │   ├─ ai/                   (providers/, curator.py, lens.py, follow.py)
│   │   ├─ content/              (curated corpus + loader)
│   │   └─ models/               (pydantic schemas)
│   └─ tests/
└─ supabase/
    ├─ migrations/               (SQL, RLS policies)
    └─ seed.sql
```

## Rendering spec
- `width: 480, height: 270, pixelArt: true, roundPixels: true, antialias: false`
- Scale mode: a custom **integer-fit** resize. Pick `zoom = floor(min(winW/480, winH/270))` (at least 1) and letterbox the rest with `#10291E`.
- The canvas CSS sets `image-rendering: pixelated`.

## Security and privacy
- RLS: every user table has `user_id = auth.uid()`.
- Location: the browser asks permission → coordinates rounded to **0.1° (about 11 km)** on the client → the server calls Open-Meteo → **coordinates are never stored**, only the resulting weather code and its expiry.
- AI: journal entries are never sent to an LLM without a per-action opt-in. API keys live only on the server.
