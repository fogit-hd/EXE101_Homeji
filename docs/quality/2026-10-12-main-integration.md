# Main integration and comparison recovery

Tracking: [FE #14](https://github.com/fogit-hd/EXE101_Homeji/issues/14). Existing draft contract: [FE #13](https://github.com/fogit-hd/EXE101_Homeji/issues/13), [BE #11](https://github.com/thanhduykx/Homeji_BE/issues/11).

On 2026-10-12 the local draft price-basis commit was rebased over frontend main ddc91a5; backend fast-forwarded to 2377d9b, which already contains the backend draft contract d1c3b56. The incoming logo, auth layout, rental assistant and food directory changes were retained.

Comparison recovery previously interpreted any failed detail read as a hidden listing. Only explicit404 or a successful inactive status now proves removal. Network, authorization, rate-limit and server errors remain unresolved, show a retryable error and suppress an incomplete comparison. Out-of-order responses preserve listing identity. This deliberately favors a verified comparison over displaying partial rankings as complete. The fallback keeps its existing zero review-summary placeholders; it does not load fresh review aggregates.

The incoming decision panel now respects the existing commute rollout flag for both controls and outbound destination data. Routes remains opt-in; long-term history was not enabled.

## Checks

- FE: 171/171 Node tests pass, including five recovery cases and two real-component SSR Routes flag cases.
- Production build and focused ESLint pass. Global lint backlog was not resolved by this patch.
- Merged BE: 358 application unit tests pass; 107 API integration tests pass, 13 opt-in database tests skipped. No migration/data import was executed in this verification.
- Local evidence: FE output/quality/full-audit/merged-*; BE output/quality/main-integration/merged-*.trx.

The Edge connection was unavailable during final deployment checking. Git push and local integration checks do not prove a successful Render deployment or live Gemini wording compliance.
