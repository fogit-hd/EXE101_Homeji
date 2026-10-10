# AI refinement and missing listing values

Tracking: [FE #11](https://github.com/fogit-hd/EXE101_Homeji/issues/11); related [BE #10](https://github.com/thanhduykx/Homeji_BE/issues/10). Independent releases, unchanged API schema.

Location chips previously sent a phrase containing “Tìm lại”, the backend's explicit full-search reset trigger. They now ask to change the area while retaining existing constraints. All chip construction lives in one builder; backend intent/service regressions verify the exact Quận 9 refinement preserves a 4m ceiling, two occupants, kitchen and area bounds. Arbitrary street resolution still relies on the parser/Places flow, not this deterministic location regression.

Saved cards, AI review and comparison use listing-specific price/area formatting. Zero, negative and non-finite source measurements display unknown; valid values remain unchanged. Unknown area does not participate in largest-area comparison. Unknown maximum occupancy stays unknown, while zero available slots remains a meaningful value.

The calculator normalizes unknown source rent to null. It can show known fee components but cannot confirm a monthly or initial total without rent. Explicitly user-confirmed zero fees retain their existing meaning; ordinary zero currency amounts (for example wallet balances) remain unaffected.

## Verification

On 2026-10-11, 22 focused tests passed, including real calculator/review SSR, cost arithmetic with missing rent, chip changes and listing formatting. Production build and focused ESLint passed. Production-build browser QA against `HOMEJI_QA_MISSING_RENT=1` loopback fixtures verified missing rent/area/maximum occupancy, no largest/cheapest badge for the missing row, calculator warning and unknown totals. No live listing was modified.

At the deployment check before this release, Render reported backend commit `4369ccd` as the last successfully deployed commit. This observation does not establish deployment of this release. Advanced Routes and long-term chat history remain disabled.
