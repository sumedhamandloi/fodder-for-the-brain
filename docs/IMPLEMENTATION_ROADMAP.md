# Implementation Roadmap

Each milestone ends with screenshots, a comparison against the references, and **creative-director sign-off** before the next one starts.

## M0: Design foundation ✅
Docs, reference analysis, architecture, sitemap, asset list. **Output: decisions awaiting approval in `DESIGN_APPROVAL.md`.**

## M1: Main World prototype (visual only)
1. **Scaffold:** Vite + React + TS + Phaser 3, integer-scaled 480×270 canvas, tokens and fonts.
2. **Art pipeline:** `palette.json`, `tools/art/build.py` (validate + compile), and the placeholder overlay.
3. **Tileset (spring):** grass (3 variants), grass↔path autotile, grass↔water autotile, flower tiles, stepping stones, cliff/forest-edge.
4. **Props:** 3 tree types (round, pine, cherry), 3 bushes, rocks, mushrooms, fence (h/v/posts), lantern, bench, flower pots, lily pads, dock, stone arch.
5. **Buildings:** cottage, library, glasshouse, each with lit-window variants. Playground pavilion.
6. **Characters:** one default player (4 directions × idle/walk) and the frog pet (follow, idle, sit, sleep).
7. **Map:** 60×40 Tiled JSON with collision and interaction zones.
8. **Systems:** movement, collision, y-sort, camera, interaction prompt, click-to-walk, Places menu.
9. **Atmosphere (basic):** local-time day/night tint, window and lantern glow, night stars and fireflies. Dev toggle to preview each phase.
10. **Ambient life:** water animation, chimney smoke, swaying blossoms (all off under reduced motion).
11. **Verification:** Playwright screenshots of 6 time phases plus a walkthrough test, then a side-by-side comparison with the guide written up in `PROGRESS.md`.
→ **Stop for visual feedback.**

## M2: Accounts and onboarding
Supabase project, migrations and RLS, auth (magic link), landing/title screen, onboarding flow, and a `SaveRepository` swap from localStorage to Supabase.

## M3: Avatar creator
Layered avatar sprites (6 skin tones, 8 hairstyles × 8 colours, 6 outfits × palette swaps, hats, accessories, shoes, backpacks), live preview, save as JSON.

## M4: Little Library (moved forward at the creative director's request, 2026-11-16)
Walkable pixel-art interior (rainy window, fireplace, tall shelves, reading desk, armchair nook). Topic shelves, short reads and deep dives from a curated, cited content set. Editorial reader, saved ideas (device + account), related concepts ("follow the thought", at most 3, curated, no AI).

## M5: Pond & Dock (moved forward at the creative director's request)
Sit on the dock: gentle nature-observation prompts, a private journal (device or account, never sent to AI, paged, no infinite scroll), My Mind Garden (saved library ideas bloom as pixel flowers), optional procedural pond ambience (off by default).

## M6: My Little Garden
Home scene, cottage interior, decor placement, inventory.

## M7: Pets
All 6 species, full state set and expressions, interactions, adoption flow.

## M8: Farming
8 crops × 5 stages (seasonal variants where relevant), plant/water/harvest/replant, elapsed-time growth.

## M9: Seasons and weather
4 seasonal tilesets and prop sets, 8 weather states, Open-Meteo integration, the "Your Little World" panel.

## M10: Intellectual spaces
Glasshouse, Brain Playground (3 games), Curiosity Garden, curated content set, NPCs with scripted dialogue.

## M11: AI Curiosity Engine
Curator, Lens and Follow the Thought, with the curated fallback.

## M12: Personalization and polish
Sound (opt-in), accessibility audit, performance, visual QA pass, data export/delete.

