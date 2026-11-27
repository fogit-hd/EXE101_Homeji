# Premium map reflections

Approved runtime values: five symmetric 6/7/8/9/10-ray variants; each 360-frame atlas spins once over 4–6 seconds. Ray length is 15.4 texture units (30% shorter than the prior approved shape). At 4.5x approved preview scale, circle wave count is 1–2 and label wave count is 1. Labels use 70% of circle size. New waves overlap outgoing waves by 2.2 seconds. Anchors sit on circle/rounded-label borders, with random variant, initial orientation and position.

The ten lossless WebP atlases preserve the approved preview pixels. Dark tiles are 64px, light tiles 128px for zoom clarity. URL assets are bundled into the renderer's lazy-loaded chunk; images decode on first visible use of each theme. Both themes share one renderer/frame loop and observer set. The custom element's disconnect callback releases marker registration when Google Maps rebuilds/removes clusters. No React root per marker, no added dependency. Hidden/offscreen/reduced-motion/forced-colors states stop the loop.

Source generation and approval history: output/verification/map-premium-assets (local ignored preview). Production browser regression: node tests/map-premium-effects.e2e.mjs with BASE_URL optional (default localhost:5194). The test uses actual map marker DOM without Google Maps/API credentials, and checks shared scheduling, click behavior, theme changes, reduced motion, offscreen pause and detach cleanup.

