# Student-authored roommate posts and interaction motion — 2026-10-10

## Corrected product behavior
The former rooms tab reused landlord rental cards. It now shows `Tin ở ghép`: people already occupying a home publish their own request for additional roommates. Cards emphasize the author, introduction, school if supplied, number of available places and estimated monthly cost per person. No student verification is inferred from renter role.

Renter authors can create/edit/submit RoommateShare posts, without landlord ownership or room-transfer consent. Existing moderation and image requirements remain. Existing landlord listings and room-transfer behavior remain compatible. The feed sends `type=2&ownerRole=1&minAvailableSlots=1`; SQL filters author role and school keyword before pagination. Legacy landlord type-2 posts are not presented as student-authored posts. No schema migration or production data rewrite was required.

## Interaction motion
Reusable accessible tabs have a measured sliding indicator, keyboard navigation and cancellable panel entry. Scoped click/tap feedback, reveal-on-scroll, modal and gallery entry reuse CSS/WAAPI and existing GSAP. Map-bound/filter URL changes do not animate the entire outlet. Reduced-motion has a native stacked landing story without artificial scroll height. See [research and source/license decisions](research/homeji-interaction-motion-2026-10-09.md). No new animation dependency or copied third-party component was introduced.

## Validation
- Backend: 312 unit + 101 API/PostgreSQL tests, zero skipped. Isolated test database; no real user post/message created. Latest TRX: `C:/Homeji/output/quality/local-95abc792bbbc4d55aba021d5e16e5460/tests/local_net9.0_20261010225109.trx`.
- Tests cover renter draft/edit/media/submit/moderation, unauthorized edits and conversions, author filtering before page size 1, school keyword, safe author fields in list/detail, durable renter-to-renter conversation and invalid ownerRole HTTP 400.
- Frontend: production build, targeted ESLint and 24 existing/extended regression tests pass. Existing bundle-size warning remains.
- Browser with explicitly local fixtures: own-card edit, other-author direct conversation, author-based feed, create-type selector, keyboard tabs and 390px no horizontal overflow (document375px/viewport390px).
- Reduced-motion browser: native grid, empty artificial height, document1513px/viewport1528px. Click pulse/tab transition runtime checked separately. Preferences and viewport restored after QA.
- Local screenshot: `output/verification/student-roommate-feed.png`. This is fixture evidence, not a claim that production contains these sample posts.

## Release
Backend commit `a6c6b6f` pushed to main. Deployment checks will be appended after live verification.

Live verification 2026-10-10:
- Backend `a6c6b6f`: Render shows Deploy succeeded / Live, duration2m23s; `/health/live` and `/health/ready`200; invalid ownerRole99 returns400. Public renter feed returns only ownerRole1.
- Frontend `c76eda3`: production now serves `/assets/index-BVOGL1j-.js` and `/assets/index-B1W39hgD.css`; browser confirms Tin ở ghép, author/school/places, per-person price, self-post CTA and direct-contact buttons using current server data. Production was inspected read-only; no message or post submitted.
- Actual production screenshot: `output/verification/student-roommate-production.png`.
