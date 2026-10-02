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
- Pending: clarify whether "Admin is also a customer" means the manager-facing dashboard
  alone or also granting rental-customer write operations (saving/appointments/reviews).
  Existing role restrictions remain unchanged until that scope is confirmed.

## Operational constraints

Reads use one DbContext sequentially to avoid EF concurrency failures. Projections avoid
N+1 queries but event rows are materialized for at most 90 days; high-volume deployments
should move daily and rental-level aggregation to the database. A series of queries is not
a transactionally consistent snapshot: concurrent writes may create small reconciliation
differences. No generic cache is added before measuring load/freshness requirements.
