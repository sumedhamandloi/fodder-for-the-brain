# Product Spec

**Fodder for the Brain**: *A little garden for a wandering mind.*

A private, single-player, pixel-art world that offers a calm alternative to doomscrolling. You walk a garden, read in a library, think in a glasshouse, play gentle puzzles, grow things, and keep a pet. Nothing is urgent, and nothing is lost when you leave.

## Principles (these work as product requirements)
Curiosity over consumption · Depth over scroll · Calm over urgency · Growth without guilt.
**Never:** streaks, timers, decay, crop death, leaderboards, autoplay, flashing, forced AI, or guilt for inactivity.
**Always:** reduced motion, opt-in sound, a clear exit, forgiving systems.

## Scope
**In scope:** individual accounts, an avatar, a personal garden, pets, crops, saved discoveries, NPCs.
**Out of scope:** multiplayer, public profiles, messaging, feeds, public gardens, competition.

## Sitemap
```
/                         Landing (title screen in pixel art) → Enter / Sign in
/onboarding               Name → Avatar → Pet adoption → Interests (optional)
/world                    MAIN WORLD (Phaser) — the hub
  ├─ Little Library       → /world/library        (React reader overlay above an interior scene)
  │     shelves · short reads · deep dives · saved ideas · related concepts
  ├─ Glasshouse           → /world/glasshouse
  │     thought experiments · critical thinking · reflection prompts · concept links
  ├─ Brain Playground     → /world/playground
  │     Pattern Detective · Little Detective · What Else Could It Be?
  ├─ Pond                 → /world/pond
  │     ambience · journal · nature observation · My Mind Garden
  ├─ Curiosity Garden     → /world/curiosity      (topic beds: science, psychology, …)
  └─ Cottage gate         → /home
/home                     MY LITTLE GARDEN (Phaser) — cottage, plots, pet area, decor
  └─ Cottage interior     → /home/inside          (inventory, decor, pet bed)
/avatar                   Avatar creator (also reachable from Settings)
/settings                 Your Little World (season / time / weather) · accessibility · account · data export/delete
```
Every location can also be reached from the **Places** menu (keyboard and screen-reader friendly).

## Main World layout (proposed. ⚠️ Needs approval)
Built from the guide's hub map:
- North-centre: **Cottage gate**, the entrance to the personal garden (the guide's cottage).
- North-west: **Little Library**. North-east: **Glasshouse**.
- West-centre clearing: **Brain Playground**. It doesn't appear in the guide; proposed as an outdoor pavilion with stone puzzle tiles.
- South-west: **Curiosity Garden** beds (the guide's crop patch is reused as topic beds in the hub). Your own crops live in /home.
- South-east: **Pond**, with a dock, waterfall and lilies.
- South edge: the stone-arch gate, which is the spawn point.
- Forest perimeter all round.

Map size: **60×40 tiles** (960×640 art px), about 2×2.4 screens.

## Core loops (gentle)
1. **Wander → notice → read.** Walk, see a marker or an NPC, open a discovery, save it if you like.
2. **Plant → (leave) → return → harvest.** Growth uses real elapsed time. Crops wait forever once mature.
3. **Pet companionship.** The pet follows, idles, sleeps and reacts. Care actions add delight, and their absence takes nothing away.
4. **Reflect.** At the pond: journal, observe, and tend the "Mind Garden" (saved ideas shown as plants).

## Milestones
See `IMPLEMENTATION_ROADMAP.md`. Milestone 1 is a visual-only prototype of the Main World.
