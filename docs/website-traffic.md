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
role protection, Vietnam date boundaries and anonymous HTTP validation. Production
recording, PostgreSQL aggregation and dashboard rendering still require deployment QA.
