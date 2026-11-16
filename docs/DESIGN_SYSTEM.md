# Design System

How the visual bible becomes reusable code and assets.

## 1. Asset pipeline (the main tool for keeping quality consistent)
```
art-src/                     ← source of truth, under version control
  palette.json               ← master palette (only these colours are allowed)
  sprites/<name>.px.txt      ← palette-indexed pixel grids (1 char = 1 pixel)
  sprites/<name>.meta.json   ← frame size, animations, anchors, status tag
  tiles/<tileset>.px.txt
tools/art/build.py           ← compiles the sources into PNG sheets plus Phaser atlas JSON
                               rejects: off-palette pixels, wrong frame size, semi-transparent pixels
frontend/public/assets/      ← generated output (do not hand-edit)
```
- Every asset is **authored at native resolution**. The engine does all scaling with integer factors only.
- Each asset declares a **status**: `placeholder` | `draft` | `final` | `approved`. A dev overlay (press `F9`) outlines placeholders in magenta, so they never pass for finished art.
- `.aseprite` or `.png` files from an artist can go straight into `art-src/` instead; the build validates them the same way.

## 2. Sprite conventions
| Type | Frame | Sheet layout | Anchor |
|---|---|---|---|
| Player / NPC | 24×32 | rows: down, up, side (right; left is mirrored). Columns: idle×2, walk×4 | bottom-centre (12, 30) |
| Pet | 16×16 or 20×20 | rows: down, up, side. Columns: idle×2, walk×4, sit, sleep×2, eat×2, happy×2 | bottom-centre |
| Expression overlay (pets) | same as frame | neutral, happy, sleepy, curious, content | |
| Tile | 16×16 | Wang/blob 47-tile sets for grass↔path and grass↔water edges | top-left |

**Avatar layering** (needed now so Milestone 3 can reuse it): body → shoes → outfit → hair-back → head/skin → eyes → hair-front → hat → accessory → backpack. Each layer has the same frame layout, and colour variants are produced by **palette swap**, not tinting.

## 3. World layers (Phaser depth order)
1. Ground (tile layer)
2. Ground details (flowers, stepping stones; non-colliding)
3. **Y-sorted entity layer** (trees, buildings, props, player, pet, NPCs)
4. Canopy overhang (tree tops the player walks behind)
5. Weather particles
6. Lighting tint and glow sprites
7. In-world markers (map pins, interaction prompt)
— Everything after this is the React overlay —

## 4. UI tokens (CSS custom properties)
```css
--c-parchment:#F0E5CB; --c-parchment-hi:#FFF8E6; --c-wood:#805536; --c-wood-dk:#4B3023;
--c-moss:#54794B; --c-forest:#183C2B; --c-ink:#3A2630; --c-blossom:#E6A0AF; --c-marigold:#E9B45F;
--px: 3px;                       /* one art pixel at the current scale; set at runtime */
--font-pixel: "Pixelify Sans", monospace;     /* labels, buttons, UI */
--font-read: "Literata", Georgia, serif;      /* reading, 18–20px, line-height 1.65, max 66ch */
--font-ui: "Nunito", system-ui, sans-serif;   /* small helper text */
```
Fonts are self-hosted (OFL licence). **Font choices still need approval.**

## 5. UI components (React, CSS Modules)
| Component | Purpose |
|---|---|
| `PixelPanel` | Parchment 9-slice panel, optional ribbon title |
| `PixelButton` | primary (moss), secondary (parchment), quiet (text) |
| `PixelToggle`, `PixelSelect`, `PixelSlider` | Settings controls ("Your Little World") |
| `MapMarker` | In-world location pin (Phaser sprite plus an accessible DOM mirror) |
| `InteractPrompt` | "E · Enter the Library" chip |
| `DialogueBox` | NPC dialogue: name tag, portrait, optional choices, always dismissable |
| `ReaderView` | Long-form reading: serif type, generous margins, no pixel font |
| `ExitHatch` | An always-visible "leave quietly" control in the corner (saves and shows a gentle goodbye) |

## 6. Accessibility
- Every in-world hotspot has a **DOM equivalent** (a "Places" list, reachable by Tab), so the whole world is navigable without moving the avatar.
- Focus rings are a 2 px marigold pixel border.
- Respects `prefers-reduced-motion`, with an in-game override.
- Contrast: UI text is at least 4.5:1 on parchment.
- All audio is off by default.
