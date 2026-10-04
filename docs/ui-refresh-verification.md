# UI refresh verification — 2026-10-04

This is a development checkpoint, not a declaration that the full request is complete.
User changes in the payment workflow and backend import notes remain intact. No deployment or database mutation has been performed in this work.

## Implemented and locally observed

- Home: banner, equal-width viewing/message panels and inbox CTA within its panel (desktop).
- Theme: shared light semantic palette; actual map-price dropdown inputs are white with dark text.
- Messages: received bubbles have dark text on white; outgoing bubbles and timestamps are white on green. Composer is white with dark text. Compact footer is within the 720 px desktop viewport.
- Message workspace also observed at 320 × 740 px with a selected conversation and attachment menu. Document width is 320 px; incoming/outgoing text, composer and compact footer remain readable and inside the viewport.
- Shared `.btn-primary` now uses dark green with white text instead of the low-contrast bright green. A numeric contrast test covers normal and hover colors (at least 4.5:1). Actual forgot-password button computed colors are white on rgb(36,84,62).
- Wallet: available balance is white on green. Tested with a complete fixture matching the Wallet API contract; no real deposits/withdrawals were made.
- Marketplace: food/goods category sets, compact cards, category/price/sort controls, own inventory kind/status filters, preserved media when editing.
- Inventory endpoint: authenticated seller lookup includes sold and archived items; application tests cover anonymous rejection and current-seller selection. Database repository integration coverage is still missing.
- Filter requests: serial loading now coalesces intermediate changes into the latest query rather than dropping them. Tests cover changed filters, retry after failure, obsolete failure, and latest failure propagation.
- Before release, lint comparison against HEAD identified new render-time ref writes and derived-state effects. Ref setup now happens in an effect; the fixed selling address/coordinates are derived from the account anchor rather than copied by an effect. Category state is keyed to its marketplace tab. `output/lint-delta.mjs` reports no increased lint rule counts in changed/new source files after these repairs. Full-repository lint is still not clean because of pre-existing findings; this is not a claim that lint passes.
- Sorting: “Mới nhất” orders the received results by creation date, independently of API distance order. It does not guarantee newest globally outside the fetched page/radius.
- Sale form: associated labels, description length/required validation, food/goods controls, current media preview. Native browser validation now accepts 35,000 VND (previously min=1/step=1000 caused stepMismatch).
- Both food and goods sale forms were observed at 320 px. Wrapping header utilities/subtabs removes document overflow. Inventory controls also fit after constraining native select widths: document width 305 px within the 320 px viewport (scrollbar gutter).
- Inventory browser check against the RAM fixture: “Đã bán” includes the sold goods listing and excludes active food. Combining “Đồ ăn” with “Đã bán” produces no results; this now says no matching listings rather than incorrectly claiming the account has never posted.
- Fixed selling address: displayed address and submitted coordinates follow the backend's existing oldest-listing account anchor. Changing that business rule to per-listing addresses requires a user decision; it has not been changed implicitly.
- Rental editing: save before submit, busy guards, coordinate invalidation after manual address changes, associated labels and numeric constraints.
- Profile: initial loading skeleton no longer waits for an animation callback it cannot emit. Basic and lifestyle tabs were opened locally; shared panel styling refreshed.
- Both Profile tabs were also observed at 390 px. That check exposed a 561 px overflowing header. Mobile header now fits the viewport; 320 px menu still opens the rental posting workflow, with explicit rental management/posting entries retained.
- Rental browser flow against a local RAM-only fixture recorded CREATE → PUT with the newly edited title → SUBMIT with that same title, then navigated to My Posts. Seeded media were used; no actual image upload or production publication occurred.
- Separate backend integration project now executes the real rental service, validators and Npgsql repositories against an isolated PostgreSQL 17 database on loopback. Two tests pass: draft/update/media-metadata/submit persists the latest title and pending status after clearing EF tracking; seller inventory includes all statuses and excludes other sellers, with media loaded. Tests also reject another owner's edit, invalid coordinates, fewer than three images and an unowned storage path. Each transaction rolls back its test rows. This does not yet prove HTTP authentication, file upload or migration history.
- Testing the **actual frontend Cloudinary media payload** exposed a real integration bug: frontend sends `bucket: cloudinary` and an owned Cloudinary URL; backend validation only accepted `homeji-media`. The regression test failed with “Bucket must be equal to homeji-media”. Backend now accepts both supported providers, requires HTTPS `res.cloudinary.com` URLs for Cloudinary without embedded credentials, and retains the existing owner/post-folder check. Six validation cases and the PostgreSQL persistence flow pass. Legacy media remain compatible.
- API boundary checks now explicitly verify anonymous requests to `/api/marketplace-posts/mine` and `/api/rental-posts/mine/stats` return 401. The 24-test API-boundary subset passes; this is not an authenticated end-to-end upload test.
- Google button: official Google Identity button in a shared card; width follows its container. Guest popup observed at 360 px with a 253 px button and no horizontal overflow. No OAuth round-trip was executed in this checkpoint.
- Subscription: failed lookup is unknown, not Free; history lookup is independent, current server package identity is preserved, focus refresh also refreshes profile. Local fixture failure test keeps Premium while history is unavailable.
- Footer: mounted unconditionally inside AppLayout, which contains all routes. Rendered checks cover home, map, messages, profile, subscriptions, auth, marketplace and guest landing; not every route/breakpoint has been visually inspected.
- Additional 320 px rendered checks cover privacy, terms, forgot-password and reset-password with an invalid/missing recovery link. All show the shared footer without document overflow. No recovery request or credential change was submitted.
- Payment-waiting route checked at 320 px both without a transaction and with a pending local fixture (no checkout link). Document width is 320 px, detail panel wraps below the status card, footer is present. Vietnamese-safe font now covers the waiting page and its headings, not only plans/history.
- Admin overview and maintenance form checked at 320 px using a RAM-only fake admin profile. Overview fits at 320 px; maintenance form fits at 305 px plus scrollbar gutter. Fields use dark text on light surfaces; shared footer is present. Analytics are synthetic and the map fallback is shown; this is layout QA, not validation of actual administrative data or Google rendering. No announcement, moderation, account or financial action was submitted.
- Login/register: lazy Three.js city/island/rental scene with GSAP motion, reduced-motion/visibility handling and static fallback. Desktop and mobile forms opened locally.

## Evidence

- `output/verification/messages-colors.jpg`
- `output/verification/google-modal-mobile.jpg`
- `output/verification/subscription-history-failure.jpg` (mocked history error)
- `output/verification/auth-city-login.jpg`
- `output/verification/profile-lifestyle-mobile.jpg`
- `output/verification/marketplace-goods-mobile.jpg`
- `output/verification/messages-mobile.jpg`
- `output/verification/forgot-password-mobile.jpg`
- `output/verification/payment-wait-mobile.jpg`
- `output/verification/admin-overview-mobile.jpg`
- `node --test tests/*.test.mjs`
- `npm run build`
- Backend: `dotnet test tests/Homeji.Application.UnitTests --no-restore`
- Backend integration: `dotnet test tests/Homeji.Infrastructure.IntegrationTests --no-restore` with explicitly guarded `HOMEJI_TEST_DB`; see that project's README for local reproduction.

## Still required for full completion

- Complete HTTP/browser rental create/edit/upload/submit with controlled non-production persistence. Actual backend service/repository persistence and validation are now covered; file upload/transport/authentication and migrations are not.
- Responsive checks of remaining feature panels/content-loaded administrative tabs. Admin overview/maintenance and payment-waiting routes have now been checked at 320 px, in addition to messages, sale forms and inventory controls; both Profile tabs at 390 px.
- Review remaining hard-coded dark card surfaces and text in administrative/less-used screens against rendered contrast.
- Actual authenticated production subscription display comparison for the affected account (aggregate SQL alone cannot prove that account's UI is fixed).
- Final integration/deployment decision for the combined payment work, coordinated frontend/backend deployment, and smoke test on Render.

## Read-only production subscription findings

At the checked database time, six active Premium records had package `PREMIUM_90` / “Homeji Premium 90 ngày”; no record was named Pro Max. Ten completed Premium payments all had linked subscription rows. These are aggregate findings, not a diagnosis of an unidentified individual account. No rights were granted or payment states changed.
