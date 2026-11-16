# Reference Analysis

Status: **Milestone 0, draft for creative-director review**
Source folder: `/design-references/` (5 files)

## 0. Inventory and how each file is used

| File | What it is | Role |
|---|---|---|
| `visual-reference-full-guide.png` (1536×1024) | The Fodder visual guide: hub map, key-location map, palette, props, characters, pets, crops, seasons, and 9 screen mock-ups | **Main benchmark** for composition, density, palette, UI framing and the overall mood. It sets direction and layout. We do not crop assets from it. |
| `world-moodboard.png` | 13 thumbnails: forest maps, an autumn pond and cottage, a greenhouse interior, two library interiors, a flower meadow, a formal garden, a pond with lilies, and others | **Mood and environment** reference for each location |
| `character-reference.jpg` | A third-party 4-direction × 6-frame walk sheet (credited "Sprites by Metronix") | **Animation structure only**: frame count, directions and walk-cycle rhythm. We do not copy the character's design. |
| `pet-reference.jpg` | Five chibi creatures, each in 8 rotations (frog-hat cat, glasses owl/cat, white cat, creature in a frog hoodie, black cat in a red hood) | **Pet design language**: silhouette, outline, shading and the rotation set |
| `crop-reference.jpg` | Crop growth-stage strips (watermarked "sample") | **Readability of growth stages only**. It is a watermarked licensed preview, so we never use it directly. |

### Gaps against the brief
The brief lists seven reference categories. In this folder they are combined:
- **Seasonal pond and cottage, greenhouse, and library** appear only as moodboard thumbnails, plus the screen mock-ups in the guide.
- **Frog pet:** there is no separate frog file. The frog shows up in two places: the green frog in the guide's *Pets* row, and the frog-hood creature (row 4) and frog hat (row 1) in `pet-reference.jpg`. I'm treating the **guide's frog plus the pet-sheet's construction** as the frog reference. *(Needs your confirmation.)*

### Moodboard outliers. I propose excluding these from the benchmark
| Thumbnail | Reason |
|---|---|
| `…205030` (orange-roof house, "GAMEHUB" watermark) | A recognisable screenshot from a commercial game, with a flatter, lower-detail style |
| `…205215` (isometric flower garden) | **Isometric** perspective, which conflicts with our 3/4 top-down view |
| `…205308` (red-cap character in the grass) | Resembles a well-known commercial character, and uses a different palette and outline style |
| `…205352` (koi pond with bridge) | A painterly anime illustration, **not pixel art** |

I'll treat these as colour and mood only, or not at all, unless you say otherwise.

## 1. Visual characteristics (from the guide plus in-style moodboard images)
- **Lush, layered density.** Almost no empty ground: grass is broken up by flower clusters, bushes, stones, mushrooms and fence posts.
- **Soft but defined forms.** Foliage is drawn as clustered "puffs" with 3–4 tone ramps and a bright top-left highlight.
- **Warm–cool balance.** Warm wood, terracotta roofs and lantern light sit against cool teal water and deep forest green.
- **Cherry blossom is the signature accent.** Pink canopies frame the edges and the pond.
- **Life details.** Smoke from the chimney, koi in the pond, lily pads with pink flowers, a waterfall, lit lanterns and potted plants on steps.

## 2. Perspective
- **3/4 oblique top-down** (classic 16-bit RPG). The ground is seen from above. Buildings, trees and characters are seen from the front, with the roof visible.
- Depth comes from **y-sorting**: objects lower on screen draw in front.
- Trees and buildings cast a **soft dark ellipse or offset shadow** down and to the right. Light comes from the **top-left**.
- No isometric and no side-view, with one exception: the interior scenes in the guide (cottage, library) use a **front-facing room cutaway**, which suits interiors.

## 3. Pixel density (estimated)
In the guide's hub map (about 900 px wide), one art pixel is about **2–3 screen px**. Measured against that:
- Ground grid reads as **16 px tiles**.
- Characters are about **20–26 px** tall; pets about **14–18 px**.
- Trees are about **48–80 px** canopies; cottage about **96×96 px**.
- The guide looks partly painterly or AI-assisted in places (soft gradients inside foliage). **Our assets will be strict pixel art**: hard edges, limited ramps and no anti-aliasing, at the same density.

## 4. Environmental composition (the hub)
- A **central cottage** at the top-centre, with the library to its left and the glasshouse to its right, all facing the viewer.
- A **winding sandy dirt path** branches from a south gate (a stone arch) to every building, using stepping stones near the cottage.
- **Pond** in the lower right, with a wooden dock, waterfall, rocks and lilies. **Crop garden** in the lower left, fenced, with a lantern.
- A **dense forest frame** on every side, with cherry trees at the corners.
- Signposting: **circular parchment map markers** with icons (book, house, sprout) float above the key buildings.

## 5. Colour palette
The guide's swatches line up with the brief's starting palette: greens from deep forest to meadow, butter-yellow, peach, terracotta, dusty pink, then sage, teal, lavender, violet and rose. Detailed ramps are in `VISUAL_BIBLE.md`. Notes:
- Saturation stays **mid-range**. Pinks are dusty rather than hot.
- Shadows **shift hue toward blue-green or violet**; they are never plain black.
- Outlines on characters and pets are a **dark warm brown-purple** (about `#3A2630`), not black.

## 6. Character proportions
- The guide's characters are **chibi, about 2–2.5 heads tall**: a large head with hair volume, small body, a 1–2 px eye, and blush.
- `character-reference.jpg` is about 3 heads, which is more realistic. **We follow the guide's softer chibi ratio.**
- From the sheet we keep: **4 directions × 6-frame walk** (we'll ship 4 frames to begin with, see `DESIGN_SYSTEM.md`), a 1 px dark outline, and 2-tone shading plus a highlight.

## 7. Pet proportions
- **About 1.2 heads.** The head is roughly 60% of the sprite, with stubby limbs and a short tail.
- A **1 px dark warm outline**, 2–3 tone fill, **pink blush cheeks**, and dot eyes with a 1 px highlight.
- `pet-reference.jpg` shows **8 rotations**. For gameplay we need 4 directions (left can mirror right), plus expression overlays.
- Pets are roughly **two-thirds of character height**.

## 8. UI direction
- **Parchment panels** (`#F0E5CB`) with a darker wood or brown border, rounded pixel corners, and a soft drop shadow.
- **Tab ribbons** for section titles; lists use small pixel icons and a serif-like display face.
- Primary buttons are **moss green with cream text**; toggles are pixel-styled.
- Vines and blossoms decorate the panel corners, sparingly.
- Text in the mock-ups is a rounded serif-ish face for headings and a clean face for body. That matches the brief: pixel font for game labels, editorial serif for reading.

## 9. Seasonal variations (guide swatches plus the autumn moodboard)
| Season | Foliage | Ground | Accents |
|---|---|---|---|
| Spring | Fresh green, pink cherry | Bright meadow | Pink and white flowers, butterflies |
| Summer | Deep saturated green | Rich grass | Yellow and blue flowers, sunflowers, fireflies |
| Autumn | Orange, amber and ochre (`…204927`) | Golden-green grass, leaf litter | Pumpkins, warm light |
| Winter | Snow-capped evergreens, bare branches | Snow tiles with blue shading | Frost, warm windows, indigo night sky |

Weather icons shown: sunny, rain, cloudy, snow and night.

## 10. Important visual details to keep
- Chimney smoke, lantern glow, and window light at dusk and night.
- Koi plus lily pads with pink blooms, and the waterfall sparkle.
- Wooden fences with posts, benches, barrels and flower pots.
- Stepping stones, mushrooms and mossy rocks.
- The stone-arch entry gate at the south edge of the hub.

## 11. ⚠️ Conflicts between the guide and the written brief
The written brief takes priority, but I want your call on each:
1. **Journey panel: "Daily Streak 7 days" and "Garden Level 3" progress bar.** This conflicts with *no streaks, no pressure*. Proposal: drop streaks. Show "a quiet record" instead (ideas saved, crops grown), with no levels.
2. **Greenhouse "Focus Mode" (Deep Work 25 min, Start).** This conflicts with *no countdown timers* and with the brief's Glasshouse purpose (thought experiments). Proposal: the Glasshouse follows the brief.
3. **"Plaza (Events & NPCs)" location.** This is not in the brief. Proposal: leave it out for now; NPCs live around the hub.
4. **Key-location naming.** The guide says "Greenhouse" and "Journal"; the brief says "Glasshouse" and puts journaling at the Pond. Proposal: use the brief's names.
5. **Brain Playground** is in the brief but missing from the guide's map. Proposal: put it in the empty west-centre clearing (see `PRODUCT_SPEC.md`).
