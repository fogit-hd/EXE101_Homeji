# Figma → Homeji Web (logged-in) implementation plan

**Source:** [Homeji Web — Màn đã đăng nhập](https://www.figma.com/design/v0kJhCy06r2pE0tsTQzNnY/Homeji-Web-%E2%80%94-M%C3%A0n-%C4%91%C3%A3-%C4%91%C4%83ng-nh%E1%BA%ADp?node-id=0-1)  
**fileKey:** `v0kJhCy06r2pE0tsTQzNnY` · **Page:** `0:1` (*Màn đã đăng nhập*)  
**Skills read:** `figma-design-to-code`, `figma-use`, `homeji-web-stack`  
**Stack lock:** React 19 + Vite + react-router-dom + plain CSS (no Tailwind, no new deps). Guest landing unchanged. No API/auth/map-fetch changes.

---

## 1. Frames read

| Frame (Figma name) | Node id | Size | Notes |
| --- | --- | --- | --- |
| Homeji — Trang chủ | `12:15414` | 1440×1024 | Content: `12:15459` Trang chủ |
| Homeji — Khám phá phòng | `12:15577` | 1440×1024 | Content: `12:15622` |
| Homeji — Bản đồ | `12:15776` | 1440×1024 | Content: `12:15821` Bản đồ phòng |
| Homeji — Chợ đồ | `12:15912` | 1440×1024 | Content: `12:15957` |
| Homeji — Ở ghép | `12:16053` | 1440×1024 | Content: `12:16098` |
| Homeji — Tin nhắn | `12:16230` | 1440×1024 | Content: `12:16275` |
| Homeji — Đã lưu | `12:16418` | 1440×1024 | Content: `12:16463` |
| Homeji — Lịch xem phòng | `12:16592` | 1440×1024 | Content: `12:16637` |
| Homeji — Gói đăng ký | `12:16836` | 1440×1024 | Content: `12:16881` |
| Homeji — Hồ sơ | `12:17009` | 1440×1024 | Content: `12:17054` |
| Homeji / Trang chủ (mobile) | `6:4` | 390×844 | Grab-green mobile language |
| Homeji / Khám phá (mobile) | `6:42` | 390×844 | Header + tabs; list content sibling `6:46` |

Each frame: `get_metadata` (via page `0:1`), `get_design_context`, `get_screenshot`.

---

## 2. Component architecture

**Shared (repeated in every desktop frame):**
- `AppChrome` → left rail *Thanh điều hướng* (224px, `#18231d`): brand mark “h” + “homeji”, 9 nav items, account chip.
- Design tokens under `--hj-*` in `index.css` (logged-in product only; guest stays on existing tokens).
- Icons: SVG assets from Figma → `public/figma/icons/`.
- Room / marketplace photo fills → `public/figma/images/` (static fallbacks; live listing images still from API).

**Per-page structures (do NOT collapse into one generic card grid):**
| Surface | Own layout |
| --- | --- |
| Trang chủ | Hero district story + dark search card + room strip + “Sắp tới” / activity rail |
| Khám phá | Page title + search row + filter column + 3-col results grid |
| Bản đồ | Title + chip filters + map canvas + right “Gần tâm bản đồ” list |
| Chợ đồ | Title + search/categories + collection hero + featured deal + product grid |
| Ở ghép | Title + roommate profile cards grid |
| Tin nhắn | Split inbox / thread |
| Đã lưu | Title + saved listing grid |
| Lịch xem phòng | Calendar + appointment list |
| Gói đăng ký | Plan comparison cards |
| Hồ sơ | Portrait card + form panels |

**Mobile:** Trang chủ + Khám phá follow mobile frames (green Grab chrome + bottom tabs). Other authed pages: stack desktop content at ≤768 without inventing a third language (cream/orange tokens + single column).

---

## 3. Design tokens (from desktop Figma)

| Token | Value | Role |
| --- | --- | --- |
| `--hj-paper` | `#f3ebdd` | App canvas |
| `--hj-ink` | `#18231d` | Sidebar, dark buttons, primary text |
| `--hj-accent` | `#e65c3a` | Active nav, CTAs, district labels |
| `--hj-cream` | `#fff9ef` | Cards / inputs |
| `--hj-border` | `#d8cdbb` | Borders |
| `--hj-muted` | `#756f64` | Secondary text |
| `--hj-soft` | `#a49b8e` | Tertiary |
| `--hj-nav-idle` | `#dce2de` | Idle nav labels |
| `--hj-nav-line` | `#334039` | Sidebar divider |
| `--hj-accent-soft` | `#fce8df` | Soft pills |
| `--hj-radius-sm` | `8px` | Buttons / chips |
| `--hj-radius-md` | `14px` | Nav items / inputs |
| `--hj-radius-lg` | `22px` | Cards / map |
| `--hj-radius-xl` | `30px` | Heroes |
| `--hj-sidebar` | `224px` | Rail width |
| Display font | Instrument Serif | Headings |
| UI font | Inter / Be Vietnam Pro | Body (already in app) |

Mobile frames also use Grab green `#00b14f` — applied only under `.app-shell--product` mobile hub/explore breakpoints where Figma specifies it.

---

## 4. Asset mapping

| Figma node / asset | Local path |
| --- | --- |
| Nav icons (house, search, map, armchair, users, message-circle, bookmark, calendar-days, sparkles, chevron-right, plus, …) | `public/figma/icons/*.svg` |
| Trang chủ hero / room fills (`12:15469`, listing images) | `public/figma/images/hub-hero.png`, `room-*.jpg` |
| Chợ đồ collection / products | `public/figma/images/market-*.jpg` |
| Bản đồ decorative map fill (UI chrome only; live map stays Google Maps) | `public/figma/images/map-backdrop.png` (optional chrome; not replacing Map SDK) |
| Mobile Grab icons | `public/figma/icons/mobile-*.svg` |

Assets downloaded via Figma MCP `download_assets` (rawImages + svgAssets) into `public/figma/`. Early `get_design_context` asset URLs expire quickly (404); prefer fresh `download_assets` URLs. No gray invent-placeholders when export exists. Inline SVG fallbacks remain in `AppChrome` for nav icons if file load fails.

---

## 5. Route / section → frame mapping

| Frame | Existing URL / mode | Presentation host |
| --- | --- | --- |
| Trang chủ | `/` (authed, no section) | `AuthenticatedHub` |
| Khám phá phòng | `/?section=listings&view=list` (or `explore`) | `AuthenticatedHomeMapShell` list mode |
| Bản đồ | `/?section=listings` (map, no `view=list`) | `AuthenticatedHomeMapShell` map mode |
| Chợ đồ | `/?section=marketplace` (+ `/marketplace`) | `MarketplacePage` in `FeatureWorkspace` |
| Ở ghép | `/?section=invitations` (+ `/invitations`) | `RoommateInvitationsPage` |
| Tin nhắn | `/?section=messages` | `MapMessagesPanel` embedded |
| Đã lưu | `/?section=saved` (+ `/saved`) | `SavedPostsPage` |
| Lịch xem phòng | `/?section=appointments` | `MapAppointmentsPanel` |
| Gói đăng ký | `/?section=payments` (+ `/payments`) | `PaymentPage` |
| Hồ sơ | `/?section=profile` (+ `/profile`) | `ProfilePage` |
| Mobile Trang chủ | `/` ≤768 | Hub + `AppChrome` bottom |
| Mobile Khám phá | explore list ≤768 | Explore list + mobile top/tabs |

**Unchanged:** guest `/`, auth routes, `/posts/new|edit`, `/admin`, API calls, map geocoding/pin data, legacy redirects.

**Nav items (desktop rail):** Trang chủ · Khám phá phòng · Bản đồ · Chợ đồ · Ở ghép · Tin nhắn · Đã lưu · Lịch xem phòng · Gói đăng ký · (account → Hồ sơ).

---

## 6. Implementation order

1. Tokens + Instrument Serif font import; asset download.
2. Rebuild `AppChrome` as Figma sidebar (desktop) + Figma mobile tab bar.
3. Rebuild `AuthenticatedHub` to Trang chủ structure; wire posts/appointments/notifications.
4. Restyle explore list + map destination chrome (keep map SDK).
5. Restyle each feature page CSS/markup to match its frame; keep data hooks.
6. Mobile hub/explore polish from frames `6:4` / `6:42` (+ list `6:46`).
7. `tsc -b` / lint / build; fix regressions.
