# Website traffic measurement

Admin overview contains estimated visits (distinct browser sessions), page views,
sessions with a view in the last five minutes, daily trends and popular page categories.
Ranges use Vietnam midnight and the selected 7/30/90-day period.

## Collection

`WebsiteTrafficTracker` follows router navigation for guest and signed-in customers.
Admin accounts and the Admin route are excluded. Random session IDs are stored in
sessionStorage, renewed after 30 minutes between measured navigations. No cross-browser
or cross-device identity matching is attempted. Multiple tabs can duplicate or split
sessions. Counts are not unique human visitors. There is no heartbeat: recent activity
means a recorded page view in the past five minutes, not confirmed presence.

`POST /api/analytics/page-views` accepts only a UUID event ID, UUID session ID and an
allowlisted page category. Server time is authoritative; raw URLs, queries, IPs,
referrers and account data are not stored in this analytics table. Event IDs prevent
duplicate insertion under retries. Do Not Track / Global Privacy Control suppress
collection. Backend/h infrastructure access logs are separate from this table.

## Security and performance

Public recording is rate-limited independently to 30 requests/minute per client key,
with a 1024-byte request limit and category validation. This is first-party telemetry,
not cryptographic proof of a human visitor; scripted traffic and blocked measurements
can distort results. A shared public IP may hit the recording limit.

`GET /api/admin/analytics/traffic` requires authentication and a stored Admin profile.
Aggregation runs in PostgreSQL, returning only bounded daily and top-page aggregates.
The new table has timestamp and session/timestamp indexes; RLS denies direct browser
database-role access. The backend table owner accesses it through the API.

Migration `AddWebsiteTraffic` only adds the new table/indexes. No earlier visits can
be reconstructed. Data before tracking began is unmeasured, not evidence of zero traffic.
The table currently retains events; a retention policy must be chosen before long-term
high-volume use. No cleanup of existing business/user data is performed.

## Verification

Frontend build and scoped lint pass. Behavior tests cover page sanitization and session
renewal. Backend tests cover anonymous recording, server timestamps, invalid categories,
role protection, Vietnam date boundaries and anonymous HTTP validation. A PostgreSQL
regression check reads the actual repository and validates daily totals and bounded
rankings. Run explicitly from the backend root with
`HOMEJI_TEST_TRAFFIC_DATABASE=1 dotnet test --filter FullyQualifiedName~WebsiteTrafficDatabaseTests`
(set the environment variable using the current shell's syntax). Otherwise this test
is skipped to avoid silently depending on a remote database.

Deployment QA caught two provider translation issues: converting a DateTimeOffset
group key to DateTime, and sorting a constructor-projected record. Daily buckets now
use parameterized PostgreSQL timezone conversion; ranking stays server-side before
mapping the bounded result to DTOs. All 155 backend tests pass with the database check enabled.

Production recording returned HTTP 204 both directly and through the frontend proxy.
QA deliberately submitted three unique test page views across two sessions (two
`other`, one `home`), including a duplicate delivery of one event. These are test
traffic, not evidence of genuine customer interest. An actual guest browser visiting
the local production build against the production API added two further test views
(`home`, `login`) in one session. Production Admin showed five views, three sessions,
and category counts 2/2/1: duplicate delivery did not add a view, and same-session
navigation did not add a session. All 7/30/90-day controls returned the same correctly
bounded totals, with Vietnam date buckets. Admin navigation remained excluded.

The chart leaves dates before the first recorded event blank rather than presenting
unmeasured history as zero traffic. Final production rendering verified: exactly one
measured day appears (2026-10-03: five views, three sessions), Admin reload does not
increase totals, and recent sessions naturally fall out of the five-minute window.
Evidence: `output/verification/admin_website_traffic.jpg` (local, not committed).
