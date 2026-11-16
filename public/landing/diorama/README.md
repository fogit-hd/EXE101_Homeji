# Diorama renders: provenance

One 3D scene of a Saigon rental room (phòng trọ), rendered in Blender. Only the daytime state (`room-found`) is kept as a still; the other acts use the story sets below. The furniture, props, textures and lighting environment are real-world photoscanned assets from Poly Haven (CC0, https://polyhaven.com). The room itself is a staged illustration of the product idea, not a photo of a real listing.

- Scene file: `tmp/blender/homeji-diorama-real.blend`, built by `tmp/blender/s10_build.py` (room + furniture) and `tmp/blender/s20_lights.py` (lights, camera, render settings).
- Rendered 2026-11-13 with `tmp/blender/render_states.py` (Blender 5.1, Cycles, 128 samples with denoising, AgX view transform, transparent film) at 1600×1376, converted to WebP (q 0.8) in Chrome via `tmp/to-webp.mjs`, at 1600 and 800 px wide.
- Used by `DIORAMA.room` in `src/lib/mock/homeji.ts` as the landing hero.

Poly Haven assets used (all CC0): old_bed_frame, plastic_monobloc_chair_01, plastic_crate_01, cardboard_box_01, vintage_electric_kettle, classic_laptop, throw_pillows_01, wall_clock (models); large_floor_tiles_02, painted_plaster_wall, rough_linen, cotton_jersey, wood_floor_worn (textures); kloofendal HDRI. The desk, pipe lamp and potted plant are Poly Haven models copied from the project's room-scroll-preview scene.

| Still | Shows | 1600 | 800 |
|---|---|---|---|
| room-found | Iron single bed, school desk with laptop and lamp at the barred window, plastic chair, kettle on crates, wall clock, daylight | 56 KB | 22 KB |

To change the room, open the .blend copy in Blender, re-run the build scripts, then re-render headless:
`blender --background tmp/blender/homeji-diorama-real.blend --python tmp/blender/render_states.py -- tmp/blender/out found 128 100`

## Story sets (stills)

Phones, tablets and reduced motion show one still per act instead of the scroll sequence. `set-street`, `set-tea` and `room-night` are frames 55, 245 and 285 of the sequence below, converted with `tmp/still-webp.mjs` (q 0.8) at 1280 and 640 px. `room-found` (above) stays the hero.

| Still | Shows | 1280 | 640 |
|---|---|---|---|
| set-street | Night sidewalk: two vintage suitcases, moving boxes, a payphone on a bare wall, a street lamp | 48 KB | 19 KB |
| set-tea | Low wooden table with a teapot and two cups, two plastic chairs facing each other on a mat | 46 KB | 19 KB |
| room-night | The room in warm evening light, desk lamp on | 42 KB | 16 KB |

## Scroll sequence (`public/landing/seq/`)

300 frames scrubbed by scroll on wide screens (`src/features/landing-hx/journey/sequence.ts`). One plinth and one light language; each act puts a different set on it, and between acts the plinth turns half a circle while the old set sinks and the next rises:

1. Hero: the room (day).
2. A gamble: a night sidewalk with suitcases, boxes, a payphone and a street lamp.
3. Verified: the three checks together, then one hero object each (clipboard and magnifying glass for the owner, a camera for the photos, a cash register for the price), then together again.
4. Find a room: a row of three-storey rooms for rent built from the modular facade kit.
5. Room-sharing: tea for two at a low table.
6. Home: the room again, at night.

- Sets: `tmp/blender/s50_sets.py` (run in the open Blender scene "Homeji Diorama", saves `tmp/blender/homeji-diorama-sets.blend`). Animation: `tmp/blender/s51_story.py` on that copy, saved as `tmp/blender/homeji-diorama-story.blend`. Anchor frames per story beat are listed in the script and in `BEATS` (`journey/context.ts`).
- Rendered 2026-11-13 with EEVEE (48 samples, transparent film) at 1280×1100 via `tmp/blender/render_frames.py`, converted with `tmp/seq-webp.mjs` to `1280/` (q 0.6, 7.9 MB) and `640/` (q 0.68, 3.4 MB).
- Extra Poly Haven models (CC0): vintage_suitcase, korean_public_payphone_01, street_lamp_01, clipboard, magnifying_glass_01, Camera_01, CashRegister_01, modular_urban_apartments_facade, small_wooden_table_01, tea_set_01.
- The earlier one-room camera move (`tmp/blender/s30_anim.py`, `homeji-diorama-anim.blend`) is superseded.
