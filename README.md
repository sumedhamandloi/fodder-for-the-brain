# Fodder for the Brain
*A little garden for a wandering mind.*

Fodder for the Brain is a private, pixel-art world in your browser and a calm alternative to endless scrolling. You walk a garden, read in a rainy-day library, write by the pond, decorate your own patch of land, and keep a small companion. Nothing is urgent. Nothing wilts while you're away. You can leave at any moment.

Underneath the garden is the real point: **a curiosity engine that gets to know how *your* mind likes to wander**, and quietly grows the world around it.

---

## Contents
1. [What works today](#1-what-works-today)
2. [Run it locally](#2-run-it-locally)
3. [Accounts and the database](#3-accounts-and-the-database-supabase)
4. [Deploy](#4-deploy-vercel)
5. [The vision: a world that grows with your mind](#5-the-vision-a-world-that-grows-with-your-mind)
6. [Principles we will not trade away](#6-principles-we-will-not-trade-away)
7. [How it's built](#7-how-its-built)
8. [Roadmap](#8-roadmap)
9. [Documentation](#9-documentation)

---

## 1. What works today

| Area | What you can do |
|---|---|
| **Main World** | Explore a hand-drawn 16-bit garden: cottage, library, glasshouse, pond, forest edge, cherry trees. Move with WASD/arrows or click to walk. The world follows your local time from dawn to night: lit windows, lanterns, fireflies, stars reflected in the pond. |
| **You** | Sign in by email link or play as a guest. Make a chibi pixel avatar (skin, hair, eyes, outfits, hats, glasses, bags) and change it any time. |
| **Companion** | A frog who follows you, sits when you rest and naps when you linger. It never gets hungry and never gets sad. |
| **Little Library** | Walk inside: rain on the window, a fire in the hearth. Browse three topic shelves of short reads and deep dives, each with sources and a question to sit with. Save ideas, and **Follow the thought** to exactly three related reads. |
| **Pond & Dock** | Sit on the dock. Gentle *notice* prompts, a private journal, optional pond sounds, and **My Mind Garden**, where each idea you save blooms as a flower. |
| **My Little Garden** | Through your cottage lies your own garden: beds waiting for seeds, a pet corner, and a lawn to decorate by placing, moving and picking up benches, lanterns, flowers and trees. |
| **Your Little World** | Choose the time of day or match your clock, reduce motion, edit your avatar, sign in or out. |

All art is original pixel art generated from code under one locked palette. See [VISUAL_BIBLE](docs/VISUAL_BIBLE.md).

---

## 2. Run it locally

You need **Node 20+**. **Python 3 with Pillow** is only needed if you change the art.

```bash
cd frontend
npm install
npm run dev              # → http://localhost:5173
```

| Command (in `frontend/`) | Does |
|---|---|
| `npm run dev` | Start the game locally |
| `npm run build` | Production build into `frontend/dist` |
| `npm run art` | Regenerate all pixel art and maps from `tools/art/` |
| `npx playwright test` | End-to-end tests (onboarding, world, library, pond, garden) |

**Controls:** WASD / arrows to walk (Shift to jog) · click to walk · **E** or **Enter** to visit · **M** for Places · **Esc** to close.

Without any configuration, everything works in **guest mode**, saved in your browser.

---

## 3. Accounts and the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run the **contents** of each file in order:
   - `supabase/migrations/0001_init.sql`: profiles, avatars, pets, preferences
   - `0002_library.sql`: saved ideas
   - `0003_pond.sql`: private journal
   - `0004_garden.sql`: garden decorations
3. In **Authentication → URL Configuration**, set the **Site URL** to your deployed address and add `http://localhost:5173` to **Redirect URLs**.
4. Create `frontend/.env.local`. This file is git-ignored and should never be committed.
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your anon public key>
   ```

Every table uses **Row Level Security**: a person can only ever read or change their own rows. Never put the `service_role` key in the frontend.

---

## 4. Deploy (Vercel)

1. Push the repository to GitHub.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repo.
3. Set **Root Directory** to `frontend`. The framework is Vite, the build command is `npm run build`, and the output is `dist`.
4. Add the two `VITE_SUPABASE_*` environment variables.
5. Deploy, then add the Vercel URL to Supabase's **Site URL** and **Redirect URLs**.

Every push to `main` redeploys automatically.

---

## 5. The vision: a world that grows with your mind

> **Status: design, not yet built.** Today the library is a fixed, hand-curated collection and "Follow the thought" uses hand-written links. This section describes where Fodder is going and why it is shaped the way it is. The plan in detail lives in [AI_DESIGN.md](docs/AI_DESIGN.md).

### The idea in one picture
A neural network learns by strengthening the connections that matter and letting the others fade. Fodder's curiosity engine is designed to grow in a similar way, but **in the open, where you can see it and prune it**.

```
             ┌───────────── the shared Idea Graph ──────────────┐
             │  Dreams ── Memory ── Consciousness ── Neuroscience │
             │     │          │                                   │
             │  Sleep ─── Spacing effect ── Learning ── Stoicism  │
             └──────────────────────┬─────────────────────────────┘
                                    │ you read, save, follow, reflect
                                    ▼
             ┌──────────── your personal Curiosity Map ──────────┐
             │   stronger links where your attention keeps going │
             │   gentle fading where it hasn't been in a while   │
             │   brand-new branches the AI proposes from sources │
             └────────────────────────────────────────────────────┘
                                    │
                                    ▼
             what grows in *your* library, garden beds and Mind Garden
```

### Three layers

**1. The Idea Graph (shared).** Every read in the library is a node, and related ideas are linked by edges. Today those links are hand-written (`related` in `frontend/src/features/library/content.ts`). As the library grows, each piece will also get a **semantic embedding** stored with **pgvector**, so the system can find connections nobody wrote down, such as noticing that a piece on tardigrades and one on Stoic resilience are both, in a way, about *waiting well*.

**2. Your Curiosity Map (personal and private).** Each person has their own weighted copy of the part of the graph they've touched. Signals strengthen a connection, like a synapse:

| Signal | Effect |
|---|---|
| Finishing a read | small boost to its topics |
| **Saving** an idea | strong boost, and it blooms in your Mind Garden |
| **Following the thought** from A to B | strengthens the *edge* between A and B for you |
| Choosing short reads or deep dives | tunes how deep suggestions go |
| Topics picked at onboarding | the starting shape of the map |

Connections you haven't revisited **fade softly**, so your map keeps reflecting who you are now. Nothing is ever lost: saved ideas stay saved, and fading only changes what is *suggested*.

**3. Growth at the edges (AI-assisted, sourced).** When your map shows sustained curiosity at the edge of what the library holds, for example several saved reads on memory and none on sleep, the engine can propose a **new branch**. It gathers material from reputable sources, and the **Fodder Lens** rewrites it at your preferred depth (simple, analogy, short read, or deep dive) **while keeping its citations**. New branches are labelled as AI-assisted and can be reviewed before they join the shared graph. This is how the library expands *itself* over time, shaped by what real people are actually curious about.

### How it caters to you, gently
- **Curiosity Curator:** at most **three** suggestions at a time, drawn from your map and filtered by your mood and how long you want to linger. There is no feed and nothing that refills itself.
- **Fodder Lens:** the same idea, told the way you like to learn: a quick analogy on a busy day, a deep dive on a slow Sunday.
- **Follow the Thought:** from any idea, three paths onward (*Dreams → Memory → Consciousness → Neuroscience*), weighted toward the connections you tend to enjoy, with one deliberately unexpected branch to keep things fresh.
- **The world reflects it:** your Mind Garden blooms with what you've saved, garden beds can grow plants named for your favourite topics, and NPCs mention ideas near your interests rather than random ones.

### You stay in charge of your map
- **See it:** your Curiosity Map will be viewable as a garden of connected ideas, not a hidden score.
- **Explainable:** every suggestion says why ("because you saved *The Ship of Theseus*").
- **Prunable:** remove a topic, forget a signal, or reset the whole map.
- **Optional:** AI features can be switched off completely, and Fodder still works fully with curated content.
- **Private by design:** journal entries and observations are never used to personalise anything, and never sent to an AI, unless you explicitly consent each time. Precise location is never stored.

---

## 6. Principles we will not trade away

Personalisation is the easiest place for an app to start manipulating people. These rules hold however clever the engine becomes:

- **No infinite scroll, no autoplay, no endless recommendations.** Suggestions arrive three at a time and stop.
- **No streaks, countdowns, or guilt.** Pets never starve, crops never die, and nothing punishes a break.
- **Optimise for curiosity, not time-on-site.** The engine learns what *enriches* you (what you save, return to and reflect on), never what merely keeps you clicking.
- **Calm by default.** Reduced-motion support, sound off unless chosen, a gentle "Leave quietly" exit always in reach.
- **Accuracy over fluency.** AI may reshape *how* something is explained, never invent *what* is true. Sources travel with every piece.

---

## 7. How it's built

| Layer | Tech |
|---|---|
| World | **Phaser 3**: tile maps (Tiled format), y-sorted sprites, arcade physics, A* click-to-walk, day/night lighting |
| Interface | **React + TypeScript + Vite**, CSS Modules, Zustand state; editorial serif type for reading |
| Art | Original pixel art generated by Python (`tools/art/`), validated against one master palette, with integer scaling only |
| Data | **Supabase**: Postgres, email-link auth, Row Level Security. Guests use browser storage behind the same interface |
| AI (planned) | **FastAPI** (Python) with a configurable LLM provider, retrieval over curated content, **pgvector** for the Idea Graph |
| Tests | **Playwright** end-to-end, TypeScript strict mode |

```
fodder-for-the-brain/
├─ frontend/            React app + Phaser game (src/game, src/features, src/state, src/services)
├─ tools/art/           pixel-art generators, map builders, palette validation
├─ supabase/migrations/ database schema and RLS policies
├─ design-references/   visual references (read-only)
└─ docs/                product spec, visual bible, architecture, roadmap, decisions
```

---

## 8. Roadmap

| # | Milestone | Status |
|---|---|---|
| 0 | Design foundation | ✅ |
| 1 | Main World | ✅ approved |
| 2 | Accounts and onboarding | ✅ |
| 3 | Avatar creator | ✅ |
| 4 | Little Library | ✅ |
| 5 | Pond & Dock | ✅ |
| 6 | My Little Garden | ✅ |
| 7 | Pets: all six companions | next |
| 8 | Farming: seeds that grow on real time and never die | |
| 9 | Seasons and weather | |
| 10 | Glasshouse, Brain Playground, Curiosity Garden, NPCs | |
| 11 | **Curiosity Engine (AI)**: Idea Graph, Curiosity Map, Curator, Lens, Follow the Thought | |
| 12 | Personalisation and polish | |

---

## 9. Documentation

| Doc | |
|---|---|
| [PRODUCT_SPEC](docs/PRODUCT_SPEC.md) | Vision, principles, sitemap |
| [AI_DESIGN](docs/AI_DESIGN.md) | The Curiosity Engine in detail |
| [VISUAL_BIBLE](docs/VISUAL_BIBLE.md) · [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) · [REFERENCE_ANALYSIS](docs/REFERENCE_ANALYSIS.md) | How it looks, and why |
| [ARCHITECTURE](docs/ARCHITECTURE.md) · [DATABASE_SCHEMA](docs/DATABASE_SCHEMA.md) · [API_DOCUMENTATION](docs/API_DOCUMENTATION.md) | How it works |
| [GAME_MECHANICS](docs/GAME_MECHANICS.md) | Movement, pets, farming, atmosphere |
| [IMPLEMENTATION_ROADMAP](docs/IMPLEMENTATION_ROADMAP.md) · [PROGRESS](docs/PROGRESS.md) · [DESIGN_APPROVAL](docs/DESIGN_APPROVAL.md) | Where we are |
