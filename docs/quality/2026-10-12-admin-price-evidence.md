# Comparable prices in administrator analytics

Tracking: [FE #22](https://github.com/fogit-hd/EXE101_Homeji/issues/22), [BE #18](https://github.com/thanhduykx/Homeji_BE/issues/18).

The dashboard previously presented every asking rent as a comparable room price. The backend now computes price statistics from positive whole-room monthly rents only, with separate counts for the eligible prices, omitted listings, and prices with usable floor area. Supply and demand counts retain all active listings.

The frontend labels room/month and m²/month explicitly and shows these sample counts next to prices. No eligible sample is rendered as unavailable, never zero currency. Payloads without complete, consistent unit/sample metadata also fail closed; their prices and price recommendations are withheld during deployment/version mismatch. Area price advice requires at least four comparable price/area samples and sufficient interaction data; the backend additionally gates against the global reference sample. These are operational safeguards, not statistical confidence or causal evidence. No price is changed automatically.

Four rendering regressions failed against the previous component, then passed after the change. They execute the actual dashboard's server rendering with Maps/traffic dependencies stubbed: legacy metadata, room-only counts, absent price/area samples, and inconsistent metadata. All 192 Node tests pass. Focused ESLint passes. The current working-tree production build passes; unrelated motion/search work remains uncommitted and is excluded from this change's commit.

API fields are additive and optional in the frontend types for rolling deployment compatibility. Existing decimal price fields are preserved; their eligibility metadata determines whether they may be shown. No migration or production-data rewrite is needed.

Release isolation: an archive of commit 1cb5e63, excluding every unrelated uncommitted change, also passes the production build and all 192 Node tests.

Production verification: backend commit 8901ad1 is Live (Render duration 2m19s), GET /health/ready returned 200 Healthy. On the original frontend origin /admin, all 51 active listings remain counted; the price card displays 36 eligible whole-room prices and 15 omitted listings, with 36 usable floor-area samples. A per-person-only area displays unavailable price instead of zero currency. Screenshot: ignored output/quality/full-audit/admin-price-production-2026-10-12.png. The latest frontend commit b62f37c was independently archived with its own npm ci dependencies and passed build plus all 192 Node tests, avoiding concurrent root working-tree changes.
