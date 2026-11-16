# Visual Bible

The single source of truth for how Fodder looks. If you break a rule here, it needs creative-director approval (see `DESIGN_APPROVAL.md`).

## Pillars
1. **Completely pixel art.** Every world element is a sprite or a tile. No CSS-drawn scenery and no emoji.
2. **Lush but calm.** The scene is dense, and the motion in it is slow.
3. **3/4 top-down, light from the top-left.**
4. **One style.** One outline rule, one palette and one pixel density everywhere.

## Grid and scale
| Thing | Native size (art px) |
|---|---|
| Ground tile | **16×16** |
| Player / NPC frame | **24×32** (body about 22 px tall, 2.3 heads) |
| Pet frame | **16×16** (small) or **20×20** (duck, dog) |
| Small prop (flower, mushroom, rock) | 16×16 |
| Bush | 32×16 to 32×32 |
| Tree | 48×64 (round), 64×80 (cherry, large) |
| Cottage | 96×96 |
| Library | 96×96 |
| Glasshouse | 80×80 |
| UI icon | 16×16 (map marker 24×24) |

- **Internal game resolution: 480×270**, scaled by an **integer factor** (2×, 3× or 4×) with nearest-neighbour filtering. Phaser `pixelArt: true`, `roundPixels: true`.
- Camera positions snap to whole art pixels.
- **No rotation or fractional scaling** of sprites. The only exception is particles of 1–2 px.

## Outline and shading rules
- **Characters, pets, NPCs and map markers:** a 1 px outline in `outline #3A2630`. Use selective outlining (a lighter outline on the lit top-left edge) only where noted.
- **Environment (trees, bushes, buildings):** no black outline. Edges are defined by the darkest step of their own ramp.
- **Ramps:** 3–4 steps per material (shadow, base, light, highlight). Shadows shift toward blue or violet, and highlights toward yellow.
- **No anti-aliasing, no gradients, no dithering** except in sky and water (ordered 2×2 dither allowed there).
- **Cast shadows:** `shadow #10291E` at 35% alpha, as an ellipse under characters and an offset blob under trees. This is the only place alpha is used inside sprites.

## Master palette (v0.1)
The brief's starting colours are marked ★. Each row is a ramp from dark to light.

| Ramp | Steps |
|---|---|
| Forest greens | ★`#10291E` · ★`#183C2B` · `#2B5536` · ★`#54794B` · ★`#8DAA76` · ★`#A9C77D` · `#D2E3A0` |
| Earth / path | `#5A3B2A` · `#8C6142` · `#B98B5E` · `#D9B784` · `#EAD3A2` |
| Wood | `#2E1D17` · ★`#4B3023` · ★`#805536` · `#A87447` · `#C99A63` |
| Stone | `#3E4247` · `#5F666B` · `#8A9190` · `#B5BAB2` · `#D8DAD0` |
| Water | `#1E4256` · `#2F6A7D` · `#4F92A0` · ★`#77B7BD` · `#B6E0DA` |
| Blossom | `#8E4C64` · `#C27390` · ★`#E6A0AF` · `#F4C6CE` · `#FCE8EA` |
| Warm accents | `#A3462F` (roof) · `#C9673E` · ★`#E9B45F` · `#F6D98E` |
| Cool accents | `#5B4E86` · ★`#A99ACB` · `#CFC5E6` |
| Night / UI | ★`#25394E` · `#1A2638` · ★`#F0E5CB` · `#FFF8E6` · outline `#3A2630` |

**Skin tones (6):** `#F6D7C3` · `#EBBE9A` · `#D49A72` · `#A9704A` · `#7C4E33` · `#4F3022`. Each comes with a shadow step.

The full palette lives in `art-src/palette.json`. The build step **rejects any pixel that is not in the palette**.

## Seasons
Each season ships its **own tile and prop variants**. These are not hue shifts.
- **Spring:** meadow grass, cherry trees in full pink, pink and white flower tiles, butterflies.
- **Summer:** a deeper green ramp, sunflowers and blue flowers, fireflies in the evening.
- **Autumn:** foliage ramp swapped to `#7A3B1E · #B5602A · #E0913A · #F2C46A`, leaf-litter overlay on grass, pumpkins, falling leaves.
- **Winter:** snow ground ramp `#9FB3C8 · #C9D6E2 · #EEF3F6`, snow-capped trees and roofs, bare cherry branches, frost on the pond edge.

## Time of day
Lighting is a **multiply tint layer plus additive light sprites** (window glow, lanterns). It is applied above the world and below the UI. The tints are fixed, palette-adjacent colours, never arbitrary filters:

| Phase | Tint | Extras |
|---|---|---|
| Dawn | `#F4C6CE` @ 25% | soft mist |
| Morning | none | |
| Afternoon | `#F6D98E` @ 10% | |
| Sunset | `#E9B45F` @ 30% | long warm shadows |
| Evening | `#5B4E86` @ 35% | lanterns on, windows lit |
| Night | `#25394E` @ 55% | windows plus lanterns glowing, stars, fireflies (summer) or snowfall glow (winter) |

## Motion
- Ambient loops are slow: 4–8 fps for water, smoke, swaying and fireflies.
- Walk cycles run at 8 fps.
- No flashing, no screen shake, no fast flicker. Thunderstorm lightning is a slow, dim 600 ms brighten. It turns off under reduced motion.
- **Reduced motion:** turns off particles and ambient loops (water stops on frame 0) and replaces the camera lerp with an instant follow.

## UI frame (React overlay)
- Parchment panels with a 9-slice pixel border (wood brown, 2 px corners), scaled by the same integer factor as the game.
- **Pixel font** for labels and buttons. **Editorial serif** for anything longer than two sentences.
- Icons are pixel sprites from the same palette.

## Forbidden
- Emoji, stock photos, vector illustrations, CSS-gradient scenery, blur, drop-shadow filters on sprites, hue-rotate seasons, neon colours, and mixed pixel densities.
