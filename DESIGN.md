---
name: Homeji Web
description: Map-first nền tảng tìm trọ & ở ghép — React/Vite SPA, token Grab-green + Maps chrome
colors:
  grab-green: "#00b14f"
  grab-green-hover: "#009241"
  grab-blue: "#136fd8"
  grab-blue-hover: "#0e52a3"
  text-primary: "#242a2e"
  text-secondary: "#69727d"
  text-heading: "#363a45"
  border: "#d5d8dc"
  surface: "#ffffff"
  surface-muted: "#f6f8fa"
  surface-input: "#f1f4f6"
  surface-elevated: "#ffffff"
  maps-blue: "#1a73e8"
  maps-blue-soft: "#e8f0fe"
  maps-blue-text: "#1967d2"
  error: "#ea4335"
  success: "#39b54a"
  map-canvas-bg: "#e8eef2"
  landing-navy: "#091d2e"
  landing-paper: "#eef3f0"
  landing-ink: "#12181c"
typography:
  body:
    fontFamily: "Inter, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  page-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.1
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1
  landing-display:
    fontFamily: "'Manrope', 'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif"
    fontWeight: 600
  landing-body:
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif"
    fontWeight: 400
  auth-display:
    fontFamily: "'Sora', 'Manrope', system-ui, sans-serif"
rounded:
  sm: "4px"
  md: "8px"
  pill: "20px"
  full: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  page-y: "32px"
  page-bottom: "64px"
components:
  button-primary:
    backgroundColor: "{colors.grab-green}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.grab-green-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.grab-blue}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "24px"
  form-input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
---

# Design System: Homeji Web

> **Phạm vi:** Design system của **exe-homeji-web** thôi. Không áp dụng StyleSheet / FlashList / Expo cho file này. Canonical: `exe-homeji-web/DESIGN.md` (hardlink tại `EXE101/DESIGN.md` khi workspace root là parent).
>
> **Stack lock:** React 19 · Vite · react-router-dom · plain CSS + CSS variables (`src/index.css`). **Không** Next.js, RSC, Tailwind, shadcn. Refactor UI hiện có phải bám token/class dưới đây; chỉ dùng image-gen greenfield khi user yêu cầu màn hình mới / redesign rõ ràng.

## Overview

**Creative North Star: "Bản đồ xóm trọ đáng tin"**

Homeji Web kết hợp landing cinematic (video full-bleed, chữ Việt lớn, accent xanh lá) với product shell kiểu Maps: nền xám lạnh, pin/omnibox, panel kính/matte, CTA xanh Grab. Cảm giác thực dụng, tin cậy, dành cho sinh viên/người thuê — không luxury editorial, không dashboard SaaS tím.

Density: landing thoáng; map UI đặc hơn, ưu tiên scanability. Dark mode đồng bộ OS hoặc `data-theme`.

**Key Characteristics:**
- Brand green `#00b14f` cho primary action; Maps blue cho focus/link/map chrome
- CSS variables toàn cục trong `:root` + dark overrides
- Class utility app-level: `.btn`, `.card`, `.form-*`, `.container`, `.page-*`
- Guest landing tách font/token riêng (`--landing-*`)
- Map shell full-viewport, không navbar height (`--nav-height: 0`)

## Colors

Palette operational: primary = Grab green; interactive secondary = Grab/Maps blue; neutrals = surface ladder + ink grays. Semantic: `--error`, `--success` (+ soft tints).

| Role | Token | Light | Dark (`html[data-theme='dark']` / prefers) |
| --- | --- | --- | --- |
| Brand primary | `--grab-green` | `#00b14f` | `#1ad66a` |
| Brand primary hover | `--grab-green-hover` | `#009241` | `#14b85a` |
| Link / secondary brand | `--grab-blue` | `#136fd8` | `#4b9fff` |
| Body text | `--text-primary` | `#242a2e` | `#e8eaed` |
| Muted text | `--text-secondary` | `#69727d` | `#9aa0a6` |
| Headings | `--text-heading` | `#363a45` | `#f1f3f4` |
| Border | `--border` | `#d5d8dc` | `#3c4043` |
| Surface | `--surface` | `#ffffff` | `#1a1d21` |
| Page bg | `--surface-muted` | `#f6f8fa` | `#121417` |
| Input fill | `--surface-input` | `#f1f4f6` | `#2a2e33` |
| Map canvas | `--map-canvas-bg` | `#e8eef2` | `#1a1d21` |
| Maps accent | `--maps-blue` | `#1a73e8` | `#8ab4f8` |

Landing-only: `--landing-navy #091d2e`, `--landing-paper #eef3f0`, `--landing-green` = brand green.

**Không** đổi map canvas sang brand green. Selection dùng `--maps-blue-soft`.

## Typography

- **App shell mặc định:** Inter (fallback Roboto / system) — `:root` trong `index.css`.
- **Landing guest:** Manrope (display) + Be Vietnam Pro (body) — `GuestHero.css` / `GuestChrome.css`.
- **Auth cinema:** Manrope / Sora — `AuthPage.css`.
- Google Fonts import trong `index.css` cũng kéo Fraunces; landing hiện map display → Manrope (Fraunces không phải face chính của UI đang ship).

Scale quan sát:
- `.page-title`: 40px / 800 / lh 1.1
- `.page-subtitle`: 18px
- `.btn`: 16px / 600
- `.btn-sm`: 14px
- `.form-label`: 16px / 500
- `.form-input`: 14px (Arial stack trong input — giữ nếu không redesign form)
- `.badge`: 12px / 600

## Layout

- Container: `--container: 1200px`; `.container` = `min(var(--container), 100% - 32px)`.
- Shell: `.app-shell` column flex; variants `--authed`, `--map`, `--guest-landing`, `--auth-cinema`.
- Nav: `--nav-height: 69px` (0 trên map shell).
- Mobile tab bar: `--mobile-tabbar-height: 64px` (ẩn trên map home).
- Page padding: `.page` 32px 0 64px.
- Map: absolute fill outlet; overflow hidden; prefer `100svh`/`100vh` ổn định.
- Breakpoints: responsive CSS theo từng component (landing/map panels); không Tailwind breakpoints.

## Elevation & Depth

- `--shadow-sm`, `--shadow-md` trên card/chrome.
- `.card:hover` shadow đậm hơn.
- Primary button hover: soft green glow (`color-mix` 35%).
- Glass: `--surface-glass` cho overlay.
- Scrim: `--overlay-scrim`.
- Map: compositor isolation (`translateZ(0)`, `isolation: isolate`) — flat tonal, không multi-layer neumorphism.

## Shapes

- `--radius-sm: 4px` — buttons, cards
- `--radius-md: 8px` — alerts, textareas
- `--radius-pill: 20px` — inputs
- Badge / chips: `999px`
- Không bo full-pill mọi CTA; primary button giữ radius-sm góc vuông mềm.

## Components

**Buttons (`.btn`):** primary / secondary / ghost / danger / sm. Min-height 48px; active `scale(0.97)` trừ trong `.app-shell--map` (dùng brightness).

**Cards (`.card`):** surface + border + shadow-sm; padding 24px.

**Forms:** `.form-group`, `.form-label`, `.form-input|.form-select|.form-textarea` — pill inputs, focus ring grab-blue; errors `.form-error` / `.alert-*`.

**Badges:** `.badge` + semantic variants trong CSS.

**Map chrome:** `MapOmnibox`, `MapPlaceDetailPanel`, `MapAppPanel`, `RentalMap`, listing cards — bám `--maps-*` / `--surface-*`; tránh brand-green fill lớn trên canvas.

**Landing:** `GuestHero`, `GuestChrome`, `GuestMapSection`, `HorizontalScrollShowcase` — video full-bleed, veil/grain, CTA khám phá Thủ Đức & Q.9.

**Loader / skeleton:** `HomejiLoader`, `ContentSkeleton`, marketplace skeletons — giữ khi thêm surface mới.

## Do's and Don'ts

**Do**
- Đọc `PRODUCT.md` + file này trước mọi UI change trên web.
- Dùng CSS variables hiện có; thêm token mới cùng naming (`--grab-*`, `--surface-*`, `--maps-*`).
- Giữ copy tiếng Việt và pattern map-panel cho surface authed.
- Dùng skills web: `impeccable`, `web-design-guidelines`, `composition-patterns` (+ overlay `homeji-web-stack`).

**Don't**
- Đừng áp dụng `react-native-expert`, `imagegen-frontend-mobile`, FlashList/MMKV/StyleSheet lên web.
- Đừng introduce Next.js, Tailwind, hoặc shadcn “vì skill gợi ý”.
- Đừng restyle toàn app theo mặc định của `frontend-app-builder` trừ khi user yêu cầu redesign / màn hình greenfield mới.
- Đừng copy component từ `exe-homeji-mobile`.
- Đừng bỏ dark tokens hoặc map-canvas constraint khi “làm đẹp”.

## Homeji web stack (agent lock)

Khi edit `exe-homeji-web/**`:

| Hạng mục | Quyết định |
| --- | --- |
| Framework | Vite SPA + react-router-dom (client only) |
| Styling | Plain CSS + CSS variables — không Tailwind/shadcn |
| `react-best-practices` | Chỉ quy tắc client SPA: async parallel, bundle imports, client fetch, rerender, rendering, js. **Bỏ qua** mọi rule `server-*`, RSC, server actions, `next/dynamic`, hydration-as-SSR-framework |
| `frontend-app-builder` | Chỉ khi user xin UI greenfield / image-gen concept mới. Refactor màn hình Homeji hiện có → bám DESIGN.md + CSS hiện tại |
| `ui-ux-pro-max` | Có thể tham khảo heuristic chung; ưu tiên token Homeji hơn palette CSV generic |
