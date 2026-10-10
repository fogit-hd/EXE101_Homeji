# Screen loading and rental price units

Tracking: [FE #9](https://github.com/fogit-hd/EXE101_Homeji/issues/9), related [BE #8](https://github.com/thanhduykx/Homeji_BE/issues/8). Independent releases; no API or migration dependency.

## Changes

Routes and utility workspaces use shared lazy component identities. Suspense surrounds screen bodies so the shell, map and notification popup remain present while code loads. A static accessible status replaces artificial loading delays. Existing route guards and URLs remain unchanged.

AI price comparisons rank only within the same price unit. Renter-authored roommate posts use per-person amounts; landlord legacy posts use whole-room rent. Missing author roles remain unknown. Whole-room calculators cannot consume per-person/unknown amounts. Raw source values remain unchanged.

## Verification (2026-10-11)

- `npm run build`: passed. Main JS entry 1,541.24 kB before, 722.94 kB after (gzip 397.34 -> 155.57 kB). Shared and route chunks load separately; these entry sizes are not a measurement of total home-page transfer or LCP.
- AI price-basis and rental-decision suites: 16 passed; legal, notification and invitation suites: 7 passed.
- ESLint passed for changed files except MapAppPanel's two pre-existing `react-refresh/only-export-components` violations, reproduced against HEAD before changes. No new lint violations in that file.
- Production-build browser smoke test against loopback API fixtures: login, saved posts, roommate workspace/tab, notifications popup and messages rendered after chunk loading; shell remained available. This is not production API verification.
- Advanced Routes and long-term chat history remain disabled.

## Tradeoffs and remaining checks

First opening a screen requires another chunk request. Static status text makes that delay visible. Hosting must serve hashed assets and the SPA fallback; stale deployment asset failures still use the existing error boundary/reload path. Production deploy and real PostgreSQL tests are not verified by this smoke test.
