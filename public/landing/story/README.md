# Landing film

The opening film on the guest landing (`src/features/landing-hx/story`).

- Rendered in Blender 5.1 (EEVEE) from `tmp/blender/homeji-diorama-sets.blend`: the street and the window corner by `tmp/blender/s79_story.py`, the other corners by `s75_story.py` (day) and `s78_story.py` (night). Every second frame of 1–129 (outside, the door), every frame of 201–339 (the four corners downstairs) and 401–419 (the room upstairs).
- Models, textures and HDRI are CC0 from Poly Haven (modular urban apartments facade kit, furniture, plants, `sunset_jhbcentral` HDRI).
- `film-day.bin`, `film-night.bin`: the whole film as one H.264 stream with a frame index, packed by `tmp/pack-film.mjs` (a keyframe every 8th frame, no B-frames). The page decodes the frames it needs with WebCodecs (`video.ts`).
- `lapse-sunset.bin`, `lapse-sunrise.bin`: the time-lapses played on the opening shot when the theme changes, packed the same way.
- `depth.png`: a 320×180 depth grid for every frame of the film (`s79_story.py … depth` with `HJ_DEPTH_W=320 HJ_DEPTH_H=180`, packed by `tmp/depth-png.py`). The page rebuilds each frame in 3D from it and moves the camera between frames, so the picture follows the scroll continuously (`warp.ts`).
- `1280/` and `night/1280/`: stills only, for the poster and for reduced motion.
- `src/features/landing-hx/story/camera.json` is the Blender camera for every frame (`s79_story.py … camera`, `HJ_CAM_ALL=1`). The page uses it to move the camera and to lay real HTML onto the walls and table tops in perspective (`surfaces.json`, `surfaces.ts`). Re-export it whenever the camera path changes, and re-render the frames with it.
