# Room detail stays open during map query normalization — 04/11/2026

The imported rental preview correctly added `source=<id>` to the URL, but HomePage immediately normalized that URL with `serializeFiltersToQuery`. Its allowlist retained native `post` and omitted imported `source`. The global detail host therefore unmounted during its initial fetch. This reproduced the reported loading shell followed by disappearance without any account or backend failure.

Preserve `source` as UI routing state when normalizing filters or updating viewport bounds. Pause automatic viewport updates while an imported detail is open, just as for native detail. Closing still removes only the source selection and retains filters. No authorization rule, owner account, listing data or API contract changed.

Regression: `node tests/source-room-stability.e2e.mjs` uses the actual RentalMapPreview, SourceRoomDetailsHost and the same normalizer/effect used by HomePage. Before the change, the dialog disappeared before it could be observed. After the change, desktop/mobile checks pass with a delayed detail response, simulated DNS failure, visible retry, successful retry and login-gated contact. Existing source navigation/detail browser tests and session-refresh browser checks pass. Network/refresh outage retains stored authentication; invalid refresh still clears it.

481 unit/contract tests passed. Production build and targeted ESLint passed. Public API verification of the screenshot's 3,700,000 VND listing (`ed92f1ec-4514-5fb8-80a3-93e6fc7a5904`) returned 200 with title and five images. No live contact was revealed or message sent during this check.
