# Homeji Admin product overview

## Purpose and delivery

The `/admin` overview supports product operations using a geographic supply/demand map,
daily line trends, and advisory price signals. Existing moderation tabs remain available.
The customer map is reachable without changing the authenticated user's role.

## Source contract

Authenticated `GET /api/admin/analytics/product?days=7|30|90`; the application service
checks the stored profile's Admin role before reading analytics. No schema migration.

Backend source: `AdminAnalyticsRepository` reads UserProfiles, RentalPosts,
UserActivities, SavedPosts, and ViewingAppointments through EF Core projections.
The API returns aggregate totals, dates, and area summaries, not customer identities.

- Current supply and price: Active rentals at query time, not historical inventory.
- Events: from Vietnam midnight at the beginning of the selected period to query time.
- Searches/views: authenticated activity only; views exclude the owner.
- Saves: currently retained saved rows created during the period, not a complete event log.
- Viewing requests: creation counts, including cancelled/rejected requests; not completed rentals.
- Independent activity ratios are not cohort conversion rates and can exceed 100%.
- Area demand uses period views/saves/requests for currently Active rental IDs only.
- Area prices are not adjusted for room quality or amenities. Signals do not establish causation.
- Areas are inferred from address text; centroids are averages of valid listing coordinates.
  Only the top 20 demand-ranked areas appear. Ward labels retain their administrative suffix
  to avoid merging identically named wards in different cities. Structured geographic IDs
  remain preferable to parsing free-text addresses.

## Decision safeguards

Demand index: 65% relative save/view ratio + 35% relative viewing-requests/listing,
compared with all active listings, bounded to 0–250. Missing global denominators use
neutral components. A score of 100 is the neutral benchmark.

Sample gates: medium requires 4 listings and 50 period views; high requires 8 listings
and 200 views. These are operational sample labels, not statistical confidence intervals.
Missing price evidence or insufficient samples suppress price recommendations.
All price actions are controlled-experiment suggestions; no write endpoint is invoked.

## Verification on 2026-10-03

- Frontend TypeScript + production build pass.
- Scoped ESLint on dashboard, Admin page, and API files passes.
- Backend application unit suite: 99 pass, including price signals, zero period interaction,
  invalid coordinates, inactive request exclusion, timezone boundaries, role rejection,
  and invalid period rejection before analytics reads.
- API integration suite: 47 pass, including unauthenticated analytics rejection and
  architectural boundaries.
- Frontend source-contract checks: 4 pass; these are structural checks, not browser tests.
- Production authenticated Admin overview verified: API data renders, 7/30/90-day controls
  work, daily chart switches to views, selecting an area updates the decision card.
  The default approximately 699px viewport and a temporary 1440px desktop viewport were inspected.
- Production customer-map link works. Nearby food and cafe categories return Google Places
  results in a separate amber right panel while preserving the selected rental on the left.
- Production contains demo/seed listings and activity. Dashboard counts reflect stored data,
  not a clean market research dataset; verify provenance before commercial decisions.
- Evidence: `output/verification/admin_dashboard_90_days.jpg` and
  `output/verification/nearby_food_right_panel.jpg` (local, not committed).
- Final production deployment verified: the Admin overview displays the demo-data caveat
  and area labels include administrative suffixes from the backend area-context fix.
- User clarified that Admin is a nontechnical manager/customer of the product, not a
  rental customer role. Manager-facing summaries are in scope; existing role restrictions
  for saving/appointments/reviews remain unchanged.

## Operational constraints

Reads use one DbContext sequentially to avoid EF concurrency failures. Projections avoid
N+1 queries but event rows are materialized for at most 90 days; high-volume deployments
should move daily and rental-level aggregation to the database. A series of queries is not
a transactionally consistent snapshot: concurrent writes may create small reconciliation
differences. No generic cache is added before measuring load/freshness requirements.

## Final manager-facing acceptance audit — 2026-10-03

The manager is a nontechnical product customer, not a rental-customer role. The
existing Homeji `/admin` is the delivery surface; no separate analytics application
or role expansion was introduced.

| Requirement | Current authoritative evidence |
| --- | --- |
| Understand operations without reading code | Live Vietnamese KPI labels, median-price explanation, pin-count explanation, five-color price legend, raw evidence and sample label in the decision card; existing moderation tabs remain visible. |
| Prioritize map and daily line chart | `AdminAnalyticsDashboard` places both in the primary grid before website traffic and the area table. Live map renders Google tiles and area markers; daily SVG renders selectable metrics. |
| Explore areas and decide where to focus | Clicking the actual Dĩ An map pin displayed its decision card with 10 views, 7 saves and 3 viewing requests in 90 days. Clicking TP. Thủ Đức displayed 80 views, 1 save and 1 request, with a review-decrease advisory. |
| Help consider increasing/decreasing prices | Calculator tests exercise both increase and decrease against demand and price position, and suppress recommendations without period views. Live decrease advisory says 3–5% or improve content; live Dĩ An says more data is needed. No price mutation is wired to the dashboard. |
| Product-development signals based on stored data | Repository reads user, rental, search/view, saved-item and viewing-request sources; authenticated production renders their aggregates. Supply, price and sample limitations are documented in the UI. |
| Consistent period and trend controls | Live 90-day line totals: 1,237 searches, 293 views, 50 saves, 25 viewing requests. View/save/request circle sums match KPI counts. Seven-day request chart has 7 points and total 0; 30-day view chart has 30 points and total 48, matching its KPI. Traffic labels follow 7/30/90 days. |
| Website-interest metrics for the manager | Live traffic reports 6 page views and 4 browser sessions, with per-page breakdown and first-record date. These include QA activity; they are not six real customers or a historical growth claim. Earlier end-to-end ingestion QA is in `website-traffic.md`. |
| Protect access and preserve business roles | Controller requires authentication; service tests reject a non-Admin before repository reads. Existing rental-save, appointment and review role rules are unchanged. |

Build and regression verification at current HEAD: production TypeScript/Vite build
passes; 16 targeted frontend checks pass (structural checks plus executable camera,
nearby-anchor and traffic-helper tests); backend 105 application tests and 49 API
integration tests pass. The opt-in real-database test is skipped in this default run,
not counted as a pass. Browser error-log inspection returned no errors during this
dashboard verification. Default approximately 699px responsive layout was inspected;
earlier desktop inspection remains recorded above.

Evidence: `output/verification/admin_manager_overview_final.jpg` (local, not committed).
The build-dashboard skill guided source reconciliation and plain-language evidence;
the dashboard remains a live in-product view, not an exported data snapshot.

Acceptance covers the manager-facing operating dashboard and advisory decision support.
It does not claim statistically validated market prices, completed-rental conversion,
clean demo-free data, or automatic price changes. Those limitations are explicit in
the delivered interface rather than hidden behind predictive claims.
