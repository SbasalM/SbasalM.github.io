# Signal Chain: art swap guide

The game (`game.js`) loads every image from `sprites/`. To replace art, drop in a new PNG with the **same file name and frame layout**. If a file is missing or broken, the game draws simple shapes instead, so nothing crashes.

Draw at small pixel sizes on a transparent background. The game scales images up with hard edges (nearest-neighbour), so crisp pixel art stays crisp. You can also draw at 2× or 4× and update `fw`/`fh` in the `ART` block at the top of `game.js`.

| File | Frame size | Layout | What it is |
|---|---|---|---|
| `player.png` | 40 × 54 | 7 frames in a row: 6 run frames, then jump | You, facing right, rendered from the rigged Sebastian in `Actors.blend` and pixelized. Drawn at 1.15×. `player-classic.png` is the original hand-drawn 14 × 20 version (4 frames: run A, stride, run B, jump); to use it, set `fw: 14, fh: 20, scale: 3, run: [0, 1, 2, 1], jump: 3` in `ART.player`. |
| `bosses.png` | 48 × 48 | 2 columns (idle, blink) × 4 rows | Rows: Compliance Binder, Timezone Beast, Studio Teardown, 50-Promo Monster |
| `token.png` | 12 × 12 | 1 frame | Skill token |
| `crate.png` | 16 × 16 | 1 frame | "Manual work" obstacle. It gets stretched to each obstacle's size, so keep it simple. |
| `gear.png` | 16 × 16 | 4 frames in a row | Headphones, universal adapter, trophy, Airchain. Also used in the reward buttons. |

## Optional backgrounds

Each stage can use a painted background instead of the built-in scenery:

1. Save it as `sprites/bg-guam.png`, `bg-wuxi.png`, `bg-greenville.png`, or `bg-mpls.png`. It should be wide and tile left-to-right, covering sky to the ground line (about 16:7 works well).
2. In `game.js`, set that entry's `src` (for example `bg_guam: { src: 'sprites/bg-guam.png' }`).

It scrolls as a slow parallax layer, with the ground strip drawn on top.

## Prompt ideas for generating art

- *"16-bit pixel art sprite sheet, 4 frames in a row, a man with short dark hair, teal t-shirt, jeans, over-ear headphones, running to the right, transparent background, crisp pixels, no anti-aliasing."*
- *"Pixel art boss monster, 48×48, a giant angry red three-ring binder stuffed with papers, sharp teeth, transparent background."* (Change the subject for the clock hydra, the gutted studio wall, and the waveform blob.)

Generated images usually come out large and slightly blurry. Send them over and they can be cleaned up in Photoshop and cut to the exact frame sizes.

## Editing content

Stage text, skills, résumé bullets, boss names, tools, and rewards all live in the `REGIONS` array near the top of `game.js`.

To test a boss quickly, open the browser console on the site and run `SignalChain._dev.boss(2)`, which jumps straight to the Greenville boss.
