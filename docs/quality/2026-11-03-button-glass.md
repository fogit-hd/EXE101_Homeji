# Shared button glass — 03/11/2026

The application registers eligible short native action buttons and action links through WebglButtonGlassEffects. One WebGL2 renderer creates bounded tiles copied to 2D canvases beneath DOM text and icons. It shares the flattened crown, curved bevel, Fresnel rim and contact shadow of the tab material. It does not capture arbitrary DOM backgrounds or pretend a constant-color scene contains refracted page content.

Known solid CSS paint is composited locally. Generic theme tints follow local paper so a neutral button does not turn black on a white island in dark mode. Authored semantic fills retain their colors. Ink uses a WCAG contrast calculation, including a pure black/white fallback for midtones where the brand's two ink colors both fail. Unknown image/gradient scenes keep authored paint unless the button itself is opaque. Image controls, vendor map controls, tabs with a dedicated renderer, dense content cards, disabled controls, and explicit exclusions remain outside this renderer.

The renderer is event-driven, observes visibility, stops while hidden, and has one context regardless of the button count. Context failure uses a solid readable fallback. DOM events, focus and accessible names remain native; canvases have no pointer input and no accessible content. Labels are never rasterized, filtered, magnified or duplicated.

Regression coverage includes light/dark at 320,390,1280px, white islands in dark mode, semantic colors, actual GPU-crown contrast, no SVG stacking, native click/keyboard actions, selected state and inline color changes, removed/replaced React children, body portals, anchored tile geometry, idle GPU silence, context loss and WebGL2 unavailable. An actual room-detail browser check caught temporary positioning ownership being released by the legacy optics engine; the new renderer now owns its static positioning marker and verifies bounded canvas geometry.

Local component checks and the complete unit suite are validation evidence, not proof that every production page has been manually examined. Physical phone GPU performance is not established by emulated viewport tests.
