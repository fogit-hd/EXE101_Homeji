# Interaction and glass compatibility

The shared choice control is imported by nineteen frontend components, including
filters, calendar time fields, profile, rental forms, marketplace and admin controls.
Its original body portal could sit outside a modal owner's DOM and become inert
behind the browser's modal top layer, regardless of its numeric z-index.

The picker now opens a native dialog layer, retains the owner's DOM containment,
and uses its existing styled panel inside that layer. This escapes clipping and
glass/transform stacking contexts on browsers supporting modal dialogs. If the
enhancement is unavailable or throws, the panel opens with a normal `open` attribute.
That fallback preserves DOM interaction but cannot guarantee escape from every
legacy-browser stacking/clipping implementation. Forms still submit the real select;
required validation, disabled options/fieldsets and reset behavior are preserved.

The visual viewport determines bounds, including on-screen keyboard offsets. Short
viewports use a compact scrollable panel without dropping options. Escape closes
the picker without closing its owner; focus returns to the visible trigger. Hiding,
disabling or closing an owner also closes its picker, preventing orphaned overlays.

Glass pseudo-faces, lens reflections, click waves and theme decorations have
`pointer-events: none`. Filter support is optional. Opaque semantic surfaces remain
when backdrop filtering is unsupported. SVG definitions do not capture input.

`observeElementResize` centralizes optional measurement for Google sign-in sizing,
auth layout/character, guest listing rail, liquid tabs and map sizing/readiness.
A missing or rejected ResizeObserver uses window resize events instead; existing
map host readiness timeouts remain bounded. Optical sizing handles older observer
entry shapes. Missing IntersectionObserver no longer leaves cards transparent;
focused reveal content is also visible immediately.

Popup presence retains the existing motion but has completion/rejection handling
and a bounded cleanup deadline. Failed or stalled animations cannot retain an
interactive closing surface. These changes do not override browser security,
privacy, hardware restrictions or intentional business/authentication restrictions.

## Evidence and limits

The original modal containment defect was reproduced using the actual React
component in a DOM test, then verified after repair. The focused suite passes 32
tests across real component DOM interactions, capability failures, decorative
hit-testing declarations, lens geometry, dark contrast and search capture.
Production build passes. New/changed shared component lint passes. The touched
legacy AuthPage/RentalMap files retain the same baseline 23 lint errors and four
warnings; no new diagnostics were introduced there.

The existing choice-picker browser fixture targets the new layer. It was not run:
local browser use is disabled in Work settings. DOM tests do not render pixels,
simulate native browser hit-testing or prove Chromium/Firefox/WebKit/mobile behavior.
Therefore this is not a claim that every option in every browser has been visually
verified. Remaining browser checks: nested dialogs, transformed/clipped containers,
calendar hour/minute selection, touch scrolling, keyboard focus, 200% zoom, on-screen
keyboard and light/dark/forced-color/reduced-transparency modes on the main flows.

Run the focused checks with:

```sh
node --test tests/interaction-resilience.test.mjs tests/decorative-hit-testing.test.mjs tests/glass-lens-geometry.test.mjs tests/dark-theme-contrast.test.mjs tests/search-interest-capture.test.mjs
npm run build
```

References: [modal dialog and inert background](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog),
[stacking contexts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context),
[backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter).
