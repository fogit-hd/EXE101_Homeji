# Admin workspace readability

The Admin overview previously hid queue counts inside the assistant and used a long horizontal tab rail. Review notes were shared between multiple posts, verification requests and withdrawals.

The workspace now has a desktop navigation rail and a collapsible mobile selector, visible queue cards, search within each loaded queue, and separate content/review columns. Financial recipients use labeled fields. Analytics retain their existing source/price safeguards, with expandable supporting explanations and a chart viewBox that follows the panel width so axis labels stay legible.

Notes are keyed by request ID and entity type. A synchronous action lock prevents overlapping moderation submissions, keeps notes on failure, and disables review inputs until completion/reload. Existing withdrawal confirmations and API contracts are preserved. No backend or database migration is required.

Validation:

- `npm run build` and `npm run lint` passed.
- All 15 tests in the six `admin-*.test.mjs` files passed.
- `tests/admin-workspace.e2e.mjs` passed in Chrome at 320, 390, 900 and 1440 px, light and dark.
- Browser coverage includes all seven sections, search/no results, empty queues, analytics failure/retry, per-row and cross-section note isolation, duplicate submission, failure/retry, cancellation of a withdrawal confirmation, keyboard navigation, and the assistant focusing the exact report after reloading.
- Inspected screenshots under `output/verification/admin-workspace/`; no document overflow at the tested widths.

All browser API and hub traffic is intercepted with fixtures, including any mutation. This validates UI behavior, not real moderation, banking transfers, or live analytics data. Google Maps rendering is blocked; the map-unavailable fallback and area data are verified. The existing optical UI tests now leave Admin navigation coverage to this dedicated suite.

Deployment target: the existing `https://homeji.onrender.com` service only. The browser suite can verify its deployed assets with `HOMEJI_TEST_BASE_URL` while continuing to intercept all API traffic.
