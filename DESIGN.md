---
name: Homeji Web
description: Map-first rental and roommate platform for students in Thủ Đức / Q.9. React/Vite SPA with warm cream paper, walnut ink, emerald brand and burnt-orange actions.
colors:
  brand: "#047857"
  brand-hover: "#065f46"
  brand-soft: "#ecfdf5"
  on-brand: "#ffffff"
  action-primary: "#bf400c"
  action-primary-hover: "#9a3412"
  action-soft: "#fff7ed"
  action-on-soft: "#9a3412"
  text-heading: "#221a14"
  text-primary: "#2f251d"
  text-secondary: "#5a4a3d"
  border: "#d9cebd"
  control-border: "#9a8670"
  surface: "#fffdf8"
  surface-muted: "#f5eee3"
  surface-input: "#f9f4ec"
  surface-elevated: "#fffffc"
  map-canvas-bg: "#efe6d7"
  error: "#b42318"
  warning: "#8a5300"
  warning-soft: "#fdf1d8"
  info-text: "#0369a1"
  premium-edge: "#dfaa42"
  premium-text: "#5e4002"
typography:
  body:
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  page-title:
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.1
  button:
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1
  label:
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  2xl: "20px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.action-primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  form-input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  badge:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Homeji Web

> **Scope:** exe-homeji-web only. Canonical file: `exe-homeji-web/DESIGN.md` (hardlinked as `EXE101/DESIGN.md`). The guest landing in `src/features/landing-hx` has its own world and is out of scope here.
>
> **Stack lock:** React 19, Vite, react-router-dom, plain CSS with CSS variables (`src/index.css`). No Next.js, RSC, Tailwind or shadcn. Icons come from `lucide-react`, never Unicode glyphs.

## Overview

**Creative North Star: "Bản đồ xóm trọ đáng tin"** (a trustworthy map of the student neighbourhood).

The signed-in app is an Operate surface: a map-first shell where renters find rooms, roommates and small services around their school. It should feel like a neighbour who knows the area: warm paper, plain Vietnamese copy, precise detail. It is not a luxury editorial, not a purple SaaS dashboard, not a neon gaming UI.

Density is calm on the hub and denser in map panels, where scanning wins. Light mode comes first, because demos run in light; dark mode follows the OS or `html[data-theme]`. Phones get a separate UI (`html[data-device='mobile']`, `src/mobile/**`), not a squeezed desktop.

**Key characteristics**
- Warm cream ground, walnut ink, emerald brand, burnt-orange primary action.
- One primary action per view, in orange. Green means brand, links, focus, active navigation and success.
- Map canvas stays neutral beige; status and category colours (pins, market, roommate) keep their meanings.
- Tokens are global in `:root`, with dark overrides under `@media (prefers-color-scheme: dark)` and `html[data-theme='dark']`.

## Colors

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Brand, links, focus, active nav, success | `--grab-green`, `--hj-accent`, `--maps-blue`, `--success`, `--text-accent` | `#047857` | `#34d399` |
| Brand hover | `--grab-green-hover` | `#065f46` | `#6ee7b7` |
| Ink on brand | `--on-brand` | `#ffffff` | `#052e22` |
| Primary action | `--action-primary` / `--action-on-primary` | `#bf400c` / white | `#f97316` / `#431407` |
| Action hover | `--action-primary-hover` | `#9a3412` | lighter orange |
| Heading / body / secondary text | `--text-heading` / `--text-primary` / `--text-secondary` | `#221a14` / `#2f251d` / `#5a4a3d` | `#f4ebde` / `#eadfce` / `#c9b9a5` |
| Ground | `--surface-muted`, `--hj-paper` | `#f5eee3` | `#110d0a` |
| Surface / elevated / input | `--surface` / `--surface-elevated` / `--surface-input` | `#fffdf8` / `#fffffc` / `#f9f4ec` | `#1d1813` / `#2a231e` / `#241d18` |
| Border / control border | `--border` / `--control-border` | `#d9cebd` / `#9a8670` | `#443a31` / lighter umber |
| Error / warning | `--error` / `--warning` | `#b42318` / `#8a5300` | `#f28b82` / `#f2c46d` |

- The Maps/Grab blue names are aliases that resolve to emerald. Keep the names stable; do not reintroduce blue.
- Pastels (`--pastel-mint`, `peach`, `sky`, `lilac`, `sand`, `rose`) tint category tiles and hovers only, never text.
- Premium uses its own gold set (`--premium-edge-color`, `--premium-fill`, `--premium-text`) and appears only on paid features.
- Every text pair must reach WCAG AA (4.5:1 body, 3:1 large). Text on a brand fill uses `--on-brand`, never a brand-coloured token.

Glass belongs to floating chrome, overlays, menus, dialogs, toasts and lenses: `--surface-glass` (cream at 80%, umber at 84%) with `blur(18px) saturate(1.4)`. Reduced transparency, increased contrast and missing blur support fall back to opaque `--surface`.

## Typography

- One family across the app: **Be Vietnam Pro** (`--font-ui`), falling back to Segoe UI and system-ui. It handles Vietnamese diacritics cleanly. Monospace (`--font-mono`) is for codes and IDs only.
- Scale tokens: `--fs-xs` 12, `--fs-sm` 13, `--fs-md` 14, `--fs-lg` 16, `--fs-lead` 18, `--fs-xl` 20, `--fs-heading` 24, `--fs-2xl` 26, `--fs-display` 32. Use the tokens; do not add literal sizes.
- `.page-title` 40/800/1.1, `.page-subtitle` 18, `.btn` 16/600, `.badge` 12/600.
- Body text is at least 14px in panels and 16px in forms (16px stops iOS zoom on focus).
- No uppercase tracked eyebrows above headings; the heading speaks for itself.

## Layout

- Container `--container: 1200px`; app content max `--app-container-max: 1160px`; side padding 24px on desktop, 16px on phones.
- Spacing scale `--space-1`…`--space-6` = 4/8/12/16/24/32.
- Shell: `.app-shell` with variants `--authed`, `--map`; the map shell has `--nav-height: 0` and fills the viewport (`100svh`).
- Phones: bottom tab bar `--mobile-tabbar-height: 64px`; content keeps the safe-area insets.
- Breakpoints are per component in plain CSS; phone-specific rules live in `src/mobile/**` under `html[data-device='mobile']`.

## Elevation & Depth

Depth is tonal and quiet: surfaces separate by a step in tone plus a hairline border, and shadows are soft and warm (walnut-tinted, black in dark mode).

- `--shadow-sm` for cards at rest and chrome; `--shadow-md` for hover and raised cards.
- `--shadow-pop` for menus, popovers and floating panels; `--shadow-sheet` for bottom sheets and dialogs.
- `--overlay-scrim` behind modals.
- No neumorphism, no coloured glows except the orange primary hover lift (`color-mix` 28%).
- The map uses compositor isolation (`translateZ(0)`, `isolation: isolate`) instead of stacked shadows.

## Shapes

- `--radius-xs` 4px: tags, keycaps, tiny marks.
- `--radius-sm` 8px: buttons and small controls.
- `--radius-md` 12px (`--radius-control`): inputs in panels, alerts, tiles.
- `--radius-lg` 16px (`--radius-card`): cards, sheets, panels.
- `--radius-2xl` 20px: bottom sheets and large hero panels.
- `--radius-pill` 999px: chips, badges, search fields, form inputs.
- Do not nest a rounded card inside another card; group with spacing or a hairline divider instead.

## Components

- **Buttons (`.btn`):** primary (orange), secondary (outline on transparent), ghost, danger, `-sm`. Min-height 48px (44px floor on phones). Press feedback is `scale(0.97)`, except in the map shell, which uses brightness.
- **Cards (`.card`):** elevated surface, hairline border, `--radius-lg`, 24px padding, soft shadow that deepens on hover.
- **Forms:** `.form-group`, `.form-label`, `.form-input|select|textarea`. Pill inputs on `--surface-input`, focus ring in brand green, errors via `.form-error` / `.alert-*` with a fix, not just a status.
- **Chips (`.hj-chip`, `.m-chip`):** pill, 44px hit area on phones, selected state uses brand-soft fill plus brand ink and a check icon, never colour alone.
- **Badges (`.badge`):** pill, 12px/600; semantic variants. "Nổi bật" and premium badges are rare by design: if most cards carry one, it means nothing.
- **Listing cards:** photo, price first (`2,5 triệu/tháng` style), area, distance to school, one secondary action. The same action set on every card type.
- **Map chrome:** `MapOmnibox`, `MapPlaceDetailPanel`, `MapAppPanel`, listings workspace. Glass panels over a neutral canvas; never a large brand-green fill on the map.
- **Messages:** Messenger-style on phones; my bubbles brand green with `--on-brand` ink, others on `--surface-muted`.
- **Loaders:** `HomejiLoader`, `ContentSkeleton`, marketplace skeletons; skeletons match the final layout.
- **Icons:** `lucide-react`, `aria-hidden` when next to a label, 14–20px, stroke 2.

## Do's and Don'ts

**Do**
- Read `PRODUCT.md` and this file before any UI change.
- Use the existing tokens; new tokens follow the same naming (`--surface-*`, `--fs-*`, `--radius-*`).
- Keep the UI copy in plain Vietnamese and the map-panel patterns for signed-in surfaces.
- Keep 44px touch targets, AA contrast and `prefers-reduced-motion` support on every change.
- Animate with `motion/react` using `src/lib/motionTokens.ts`, `transform`/`opacity` only, easing `--ease-out` (no bounce).
- Check light mode first, then dark, at 375px and 1280px.

**Don't**
- Don't add `!important` to win a specificity fight; raise the selector or scope it. The remaining ones are commented.
- Don't use Unicode glyphs (✕ ‹ › ↗ ★) as icons.
- Don't paint the map canvas or large areas in brand green.
- Don't put two primary (orange) actions in one view.
- Don't introduce Next.js, Tailwind, shadcn, or React Native patterns.
- Don't touch `src/features/landing-hx` from app work.

## Homeji web stack (agent lock)

| Area | Decision |
| --- | --- |
| Framework | Vite SPA + react-router-dom (client only) |
| Styling | Plain CSS + CSS variables; no Tailwind/shadcn |
| Motion | `motion/react`; tokens from `src/lib/motionTokens.ts`; `MotionConfig reducedMotion="user"` wraps the app; GSAP only for the brand intro; no transform press in the map shell |
| Icons | `lucide-react` |
| `react-best-practices` | Client SPA rules only; skip `server-*`, RSC, server actions |
| Gates | `npx tsc -p tsconfig.app.json --noEmit`, `npx eslint src --quiet`, `npm test`, `npx vite build` |
