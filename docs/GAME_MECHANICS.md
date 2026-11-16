# Game Mechanics

## Movement and interaction (Milestone 1)
- WASD or arrow keys, 4-directional with diagonal allowed. Speed is **72 art px/s** (unhurried). Holding Shift is a gentle jog (110) and can be toggled off.
- Collision uses Arcade physics. The player body is a **10×6 px box at the feet**, so the head can overlap trees and roofs (correct for 3/4 view).
- **Interact:** E or Enter when an interaction zone is within 14 px. A prompt chip appears. Clicking or tapping a building or marker walks the avatar there, then opens it. The keyboard alternative is the **Places** menu (`Tab` or `M`).
- The camera follows with a light lerp (0.12) and is clamped to the map bounds.

## Pet companion (Milestone 1: one pet, follow plus idle)
- Follows the player along a breadcrumb trail, staying 18–28 px behind. It stops when close.
- Idle after 4 s; sit after 10 s; sleep after 45 s of player stillness.
- Collides with the world but **never blocks** the player (no pet–player collision).

## Atmosphere
- **Time:** local clock via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Phases: dawn 05–07, morning 07–12, afternoon 12–17, sunset 17–19, evening 19–21, night 21–05. Transitions are 60 s crossfades.
- **Season:** from the local month and hemisphere. If the user skips location, it defaults to the northern hemisphere and can be overridden.
- **Weather:** auto (Open-Meteo WMO code → our 8 states), random (changes every 20–40 min, gently), or a manual state.
- **Priority:** manual > random > automatic, applied **independently** to season, time and weather.

## Pets (Milestone 5)
States: idle, walk, follow, eat, sleep, play, happy. Interactions: feed, pet, play, walk, give toy. Pets have **no hunger or affection decay**. Interactions add a small "contentment" glow that settles back to a calm baseline. That is a neutral state, never a negative one.

## Farming (Milestone 6)
```
stage(t) = clamp(floor(effective_growth / stage_duration), 0, 3)  → seed, sprout, growing, mature
effective_growth = base_elapsed + watering_bonus
```
- Watering speeds growth (×1.5 for the next 6 h). It is **never required**.
- Mature crops wait indefinitely. **Crops never die.** Harvested → the plot returns to tilled soil, ready to replant.
- Durations (real time) are gentle, for example carrots 2 h, pumpkins 12 h. Tuning is still open.

## Inactivity
Returning after any gap shows a soft greeting ("The garden kept growing while you were away"). Nothing negative is ever displayed.
