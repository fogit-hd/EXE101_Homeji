# Local AI integration — 2026-10-09

Integrated origin/main c915407 into integrate/local-ai-20261009.
Local main remains at 7dcc36c. No push was performed.
Original uncommitted work is preserved by commit 57869d6.

Conflict decisions:
- Keep current main search, chatbot, map, roommate UI, rollout flags and draft assistant.
- Add the local server-backed cost/commute panel to the saved-post comparison.
- Add the local admin assistant alongside the existing overview.
- Adapt the local search dialog to the current review component contract.
- Keep rental-assistant API helpers and supporting components.

Validation:
- npm run build: passed.
- node --test tests/*.test.mjs: 132 passed, 5 failed.
- The 5 failures are existing palette/font expectations in rental-amenity-contrast.test.mjs and ui-consistency.test.mjs. Both test files and the CSS read by the failing assertions match origin/main exactly; no main styling was changed to address these unrelated failures.
- git diff --check: passed.