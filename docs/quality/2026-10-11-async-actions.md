# Acknowledged UI actions and delayed loads

Tracking: [FE #10](https://github.com/fogit-hd/EXE101_Homeji/issues/10); related [BE #9](https://github.com/thanhduykx/Homeji_BE/issues/9). Releases are independent; no API or database contract change.

## Roommate discovery

A directory refresh captures invitations before a new invitation succeeds. Its delayed response previously replaced the acknowledged invitation and enabled another invite. Reconciliation now protects only IDs acknowledged after that request began. A later fresh request remains authoritative, including cancellation/deletion; newer server timestamps still win. Idempotent Accepted responses replace rows by ID and show an existing-connection message.

This stores one revision per locally acknowledged invitation during the mounted workspace. It avoids changing networking contracts or adding caching. Seven tests cover both response orders, fresh removals, idempotent Accepted responses, unrelated deletion and newer server status.

## Notifications

Mark-one and mark-all share an immediate request lock plus visible disabled/busy buttons. Errors retain read state and surface through the page notice. Known successful reads overlay late list responses; the unread tab excludes read items immediately. Bulk read commits local onboarding notices only after server success, avoiding partial local writes on rejection.

Read state is monotonic in the current product (there is no mark-unread action). A future mark-unread feature would require revisiting the local acknowledged-ID overlay.

## Verification (2026-10-11)

- Production build and focused ESLint passed.
- 18 tests across invitation state, notification API transaction, presentation, popup, hub authentication and invitation chat passed.
- Production-build browser QA against loopback fixtures with 1.2-second delayed writes and a first bulk-write failure: action buttons disabled during requests; rejection kept all six unread and showed an error; marking one server notice removed it from unread and reduced badge to five; retrying bulk read produced an empty unread tab and cleared badge.
- Fixture failures/delays are opt-in via `HOMEJI_QA_NOTIFICATIONS=1`; no production credentials or writes are used. This does not establish production deployment or provider health.
- Advanced Routes and long-term chat history remain disabled.
