# UI refresh verification — 2026-10-04

This is a development checkpoint, not a declaration that the full request is complete.
User changes in the payment workflow and backend import notes remain intact. The combined frontend/backend changes have been pushed to main and deployed on Render. No production database mutation has been performed in this work.

## Release and production checks

- Frontend main: `51ffcf0f648fad279e39ff385eb483545e6e618e`; Render deploy `dep-db0tsmrtqb8s738pbgl0` reported Live. The exact requested site, https://exe101-homeji.onrender.com/, serves the new home banner, profile layout, subscription display and shared footer.
- Backend main: `7239c9a22d5bfa443bb6969ebc88a2e748467579`; Render deploy `dep-db0trsmq1p3s73enkem0` reported Live.
- Verification: frontend build and 76 tests passed; backend application 133 tests passed; isolated PostgreSQL integration 2 tests passed; API integration 71 tests passed and 8 database-dependent tests skipped. Full-repository lint remains non-clean as noted below.
- At 2026-10-04 05:10 UTC, the authenticated production browser showed profile Homeji Admin (administrator, Basic) and current subscription Homeji Free. Both database profiles named Homeji Admin have zero subscription rows, so this observed Free display agrees with the database. This does not identify or verify the user's separate alleged Pro Max account.
- Read-only SQL at the same time found six active `PREMIUM_90` / Homeji Premium 90 ngày subscriptions and no Pro Max package name/code. All ten completed subscription payments have linked subscription rows. No subscription or transaction was changed.
- Production subscription screenshot: `output/verification/production-current-subscription.jpg`.

## Implemented and locally observed

- Home: banner, equal-width viewing/message panels and inbox CTA within its panel (desktop).
- Theme: shared light semantic palette; actual map-price dropdown inputs are white with dark text.
- Messages: received bubbles have dark text on white; outgoing bubbles and timestamps are white on green. Composer is white with dark text. Compact footer is within the 720 px desktop viewport.
- Message workspace also observed at 320 × 740 px with a selected conversation and attachment menu. Document width is 320 px; incoming/outgoing text, composer and compact footer remain readable and inside the viewport.
- Shared `.btn-primary` now uses dark green with white text instead of the low-contrast bright green. A numeric contrast test covers normal and hover colors (at least 4.5:1). Actual forgot-password button computed colors are white on rgb(36,84,62).
- Wallet: available balance is white on green. Tested with a complete fixture matching the Wallet API contract; no real deposits/withdrawals were made.
- Marketplace: food/goods category sets, compact cards, category/price/sort controls, own inventory kind/status filters, preserved media when editing.
- Inventory endpoint: authenticated seller lookup includes sold and archived items; application tests cover anonymous rejection and current-seller selection. The isolated PostgreSQL integration test also verifies all statuses, ownership and loaded media.
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
- Additional production QA found a populated pending-review card with content width 0 px at a 714 px viewport: the action group had width 100% inside a non-wrapping flex row. A RAM fixture reproduces that exact zero-width signal. Controls are now bounded to 40% on desktop and stacked below content at <=768 px. Rechecking the actual rendered card passes at 714 px (content 633.6 px), 320 px (content 239.2 px, document 305 px plus scrollbar), and desktop. This changes layout only, not moderation decisions. The source contract test preserves the responsive rules; rendered measurements are the stronger layout evidence. Screenshot: `output/verification/admin-pending-mobile-fixed.jpg`.
- Further production checks at 320 px cover 50 populated activity cards, 17 wanted-post cards, the empty saved-post page, and the populated notification popup. Footer is present; observed document widths are 305 px plus gutter or 320 px, without horizontal overflow. Solid-background text measurements identified gray status text at 4.44:1, the peach map CTA at 3.57:1, and the saved-page small eyebrow at about 3:1. Semantic corrections now darken gray/blue status text, green badge backgrounds, map CTA normal/hover text, and the shared section eyebrow. Numeric regression coverage checks these small-text pairs against 4.5:1. This is not a claim that every text state, gradient or image background is automatically contrast-certified.
- Those color corrections were pushed as `e004e65812675263a69313de8ed867e2c62841a1`; Render deploy `dep-db0u972vcj2c739m6ja0` succeeded. The exact requested production URL now computes gray badge text as rgb(82,99,88), map CTA text as rgb(36,84,62); the solid-background check reports no low-contrast text on the loaded activity and wanted-list screens at 320 px. Screenshot: `output/verification/production-activities-contrast-fixed.jpg`.
- Wanted-post creation form also now has six associated labels (clicking the title label focuses `wanted-title`), length limits matching the backend domain (200/2000/300), positive budget and integer occupant constraints, pending-submit guard/button state, and a back-to-list action. Local RAM-only browser check at 320 px observes white inputs/dark text and document width 305 px plus gutter. Budget 0 reports native rangeUnderflow. A valid submission disables the buttons while pending, sends exactly one fixture request with the entered 3,500,000 VND budget, then returns to browse. This is not production posting or PostgreSQL persistence evidence. Screenshot: `output/verification/wanted-form-mobile-fixed.jpg`.

## Evidence

- Populated production marketplace inspection found persisted goods categories absent from the static dropdown (`Bàn ghế`, `Điện gia dụng`, `Sách`, etc.). Filter choices now include exact non-empty persisted names from the loaded catalog/current seller inventory, restricted to the selected listing kind, plus the defaults and current selection. This preserves old data instead of silently recategorizing it. Choices outside the fetched catalog/radius are not guaranteed. Pure tests cover legacy selection, kind isolation, deduplication and selection retention while requests are pending.
- Loaded goods cards had green status text at 3.62:1 and prices at 4.19:1. The loaded food page (23 cards) also had orange action text at 3.4:1 and green prices at 4.12:1. The semantic card colors/food tokens now use dark green and burnt orange, with numeric >=4.5:1 regression checks. Live verification of this latest revision is pending.

- Additional read-only production checks: the two home panels measure exactly 592.4 px wide and 107.6 px high at a 1280 px viewport; the inbox action ends 16.8 px inside its panel. Appointment timeline/list empty states fit at 320 px with a footer (document width 314 px). Wallet deposit loads the real zero balance, white on green, and fits at 305 px plus scrollbar gutter. No transaction was submitted.
- Rendered wallet contrast inspection exposed additional low-contrast gray captions (`#708079`, 3.48–4.16:1 on light/tinted surfaces) and orange accent/submit text (about 3.35–3.38:1). The wallet component now uses `#526358` for muted text and `#a43c22` for text/filled-button accents; the marketplace header shares the latter accent. Decorative radio/focus colors remain unchanged. Numeric tests cover actual white, warm, mint and paper surfaces at >=4.5:1. Frontend build and all 80 tests pass. Production confirmation of this latest correction is still pending.

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
- The current authenticated account's subscription comparison is now verified as described below; historical behavior for an unidentified Pro Max account is not established.
- Broader production smoke checks beyond the observed home/profile/subscription pages; coordinated frontend/backend deployment is now live.

## Read-only production subscription findings

At the checked database time, six active Premium records had package `PREMIUM_90` / “Homeji Premium 90 ngày”; no record was named Pro Max. Ten completed Premium payments all had linked subscription rows. These are aggregate findings, not a diagnosis of an unidentified individual account. No rights were granted or payment states changed.

## Current follow-up: no Docker required

The user explicitly requested continuing without Docker. Docker is not required for
the application or deployment and is not a gate for UI/build/unit/API verification.
The optional isolated PostgreSQL HTTP cases remain unverified; no production writes
are used to substitute for them. Backend integration README now records independent
test commands and an existing local PostgreSQL option without installing a server.

- Re-run on current sources: frontend build succeeds; all 84 frontend tests pass;
  backend application 133 pass; API integration 71 pass and 8 database-dependent cases
  skip. Skips do not prove persistence, JWT authentication, file upload or migrations.
- Latest deployed color checkpoint before this follow-up: frontend
  `0c24765dde9ffd1e406843ea0fc6e7bb8c8c68d8`, Render
  `dep-db0ump0jo6nc73a19s3g` Live. Populated production food at 320 px has 21 cards,
  corrected peach featured caption, dark green prices and white-on-burnt-orange actions.
  Production wallet captions/actions and persisted goods category filters were also
  verified, superseding the pending-live notes above.
- Current authenticated production account displays Homeji Premium 90 ngày, expiry
  00:51 12 October 2026 (UTC+7). Read-only SQL finds exactly one matching displayed-name
  profile with active `PREMIUM_90` and expiry `2026-10-11 17:51:04.940231+00`.
  Package and localized expiry match. No entitlement/payment mutation was performed.
  This establishes the observed account, not an invented Pro Max package.
- Additional actual production inspection finds two rental-owner cards at 320 px:
  action groups consume the flex row, content width is 0 px, document width 440 px.
  The rental card now has a dedicated class: desktop actions are bounded to 40% and
  stack below content at <=768 px. Notification popup styling is unchanged.
  Local fixture after correction: content/actions each 240 px at viewport 320,
  document width 305 plus scrollbar gutter; desktop 1280 has content 727.2 px and
  actions 320 px, document width 1280. No rental status action was submitted.
  Screenshot: `output/verification/rental-owner-card-mobile-fixed.jpg`.

The rental-card layout is now verified live in merged release
`ae4a94d32109913facd018f366170553147241ab`, Render deploy
`dep-db15ghbtqb8s738vlhhg` (Live, 46.3 seconds). It preserves the user's newer
`7dcc36c` changes. Both real rental-owner cards at 320 px have content/actions 240 px,
document 305 px plus gutter, and the shared footer. Screenshot:
`output/verification/production-rental-owner-card-mobile-fixed.jpg`.
Full completion
is not asserted; remaining rendered states and controlled upload/submit evidence stay
in scope, with optional database verification clearly separated from Docker availability.

## Rental editing: preserve existing terms

The edit form's PUT payload omitted electricity/water/internet prices, max occupants,
available slots and house rules. The backend DTO assigns defaults to omitted fields
and `RentalPostService.UpdateAsync` passes every field to `UpdateDetails`, so editing
only a title could overwrite existing rental terms. These fields are now copied from
the loaded post; legacy payloads lacking them retain backend-compatible defaults.
No new business rule or database migration is introduced.

`node --test tests/rental-edit-preservation.test.mjs` executes the actual
`persistDraft` function body with a captured API boundary. Before the fix both cases
failed (electricityPrice undefined instead of 3500 / 0); after the fix both pass.
It checks preservation of all six fields, zero charges, null house rules, legacy
defaults and changed title/price. This proves the request payload, not PostgreSQL
persistence or actual browser upload. Current worktree build and all 88 frontend
tests pass. Concurrent user chatbot edits remain unstaged and preserved.

## Rental images: partial-failure progress

The image handler previously updated the visible post only after every metadata
attachment succeeded. If a later request failed, confirmed images disappeared from
the local display and remained selected for retry. It also cleared files that were
not processed because of the ten-image limit. The handler now updates the visible
post and removes each acknowledged file from the selection after each successful
attachment. Failed/unprocessed files remain selected. File selection/upload controls
are disabled while saving/uploading; upload is disabled at ten images. Previous
success text is cleared at the start of an attempt.

Four actual-handler tests cover partial metadata failure, ordered successful
attachments/thumbnail, ten-image bounds and storage failure. The two failing cases
were observed before the fix and all four pass after it; full worktree build and all
92 frontend tests pass. This does not guarantee idempotency when a server commits
an attachment but its response is lost; that requires server reconciliation.

A local-only RAM API/browser check uploaded three public project PNGs using the
real file chooser/multipart client, with an injected second-attachment failure.
Three seeded images became four visible images; the retry button read “Tải 2 ảnh”.
Retry uploaded only two files and produced six visible attachments. Changing the
title and choosing “Lưu & gửi duyệt” recorded PUT with the new title followed by
SUBMIT with the same title and six images, then navigated to My Posts. These are
synthetic image responses and RAM persistence, not Cloudinary, PostgreSQL or actual
JWT verification. No production image, post or financial mutation occurred.
Concurrent user auth-scene and chatbot edits remain excluded from this release.

## Populated production payment palette follow-up

Read-only inspection of actual plans/history found remaining contrast failures:
payment eyebrow 2.88:1 on the warm page, lead 4.21:1, current-package muted labels
4.30:1, gray plan duration text 1.46:1 on orange, white feature text 3.53:1 on orange,
and transaction captions/statuses around 3.76–4.37:1. The audit walks rendered DOM
text against its nearest opaque solid background; gradients, partial opacity and
image backgrounds are excluded and are not automatically certified.

Payment CSS now has scoped accent `#a43c22`, muted `#526358` and inverse-muted
`#d7e3da` tokens for plans/history/waiting surfaces. Featured/popular plan price text
is explicitly white, preventing generic paragraph styling from turning duration
text gray. The dark green current-package card is preserved. No package prices,
benefits, entitlement or payment behavior changes. Numeric regression tests cover
the actual light/warm/tinted/dark surfaces; full build and 93 frontend tests pass.
Live rendered verification of this new palette is pending deployment.
