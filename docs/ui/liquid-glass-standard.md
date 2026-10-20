# Homeji Liquid Glass

One material is shared across action buttons, search shells, moving tab faces and switch beads. Adjust the material in `src/glass-material.css`, not in individual feature stylesheets. `LiquidGlassEffects` applies it to registered controls, including portals and controls mounted after navigation.

The user's six reference photographs define the intended appearance:

- A neutral, clear center transmits the background's colors.
- The curved shoulder bends background imagery in opposing directions. Circular caps keep their curvature when the control becomes wider.
- A thin white reflection, darker side edge and soft contact shadow reveal thickness. Colorful backgrounds remain colorful; there are no decorative rainbow lines.
- Foreground labels and icons remain sharp. Only background pixels enter the optical filter.

## Shared sources and shape variants

- `glass-material.css`: clear tint, rim, curved highlights, shadow, scene blur/saturation and travel/settling duration; light/dark variants.
- `glassLensGeometry.ts` and `glassLensFilters.ts`: one refraction engine with clear control, shallow surface and raised switch-bead profiles. Search/action faces soften high-contrast scenery. A moving tab crossing its labels omits this broad reflection and source blur to protect ink contrast.
- `glass-controls.css`: applies this material to registered controls and preserves semantic contrast for primary, danger and financial actions.
- `LiquidTabList`: one persistent moving face shared by tab groups. Selection changes immediately. During travel/drag the face crosses and refracts background labels, stretches and settles; at rest the labels return above the face.

Geometry is allowed to vary: a switch has a raised lip, a search field is a capsule, and a form field is a quieter editing surface. Dense content, photos and vendor controls do not receive optical distortion. `data-glass-exclude` excludes an entire subtree in both the registrar and CSS.

## Verification

Run `glass-reference-calibration.e2e.mjs` with `HOMEJI_GLASS_REFERENCE_DIR` pointing to the supplied photos. Inspect the generated side-by-side image, as well as opposite-edge displacement, color transmission and same-height cap geometry. Recreated HTML backgrounds and fonts differ from the photographed native UI; the bounded metrics are not a percentage of overall visual fidelity.

`glass-material-standard.e2e.mjs` checks the shared computed material and exclusions across control types. `liquid-tab-transition.e2e.mjs` checks real intermediate movement, glyph refraction, sharp resting layers, rapid retargeting, drag, narrow layouts and keyboard navigation. Reduced motion selects immediately without fluid travel; reduced transparency/high contrast use opaque, readable surfaces. No payment or authentication contract changes are involved.
