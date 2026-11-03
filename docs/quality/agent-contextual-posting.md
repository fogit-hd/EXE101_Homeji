# Contextual posting regression

## Report and cause

The reported sequence was an image with “đăng pas lại cái ghế giá 500k”, then “1. tình trạng mới, kick thước 500mm*200mm, chất liệu da”, then “1”. The single-s spelling missed the backend posting router. A red routing test demonstrated zero tool calls for that spelling, while “pass” called the agent. Generic model replies subsequently claimed a draft/publication without executing a tool.

## Changes

- Recognize the bounded Vietnamese posting spelling variants before routing.
- Resolve short field refinements from recent user messages, excluding assistant claims. Keep the existing six-message/1,000-character context budget and stop recovery across unrelated topics.
- Reuse server-owned draft images when a pending draft exists. The frontend can recover actual in-memory images only for an immediately continuing posting task; persisted attachment markers do not recreate files.
- Preserve price and item details on partial edits. A confirmation-only chat reply returns the same pending draft without generation or publication.
- Guard generic model replies against unverified publication claims. Real publication still requires the explicit approval endpoint, Premium entitlement, ownership and validation.

## Evidence

- Backend application unit tests: 680 passed, including the original spelling regression, bounded continuation, unrelated-topic handling and unsupported-success replies.
- Isolated PostgreSQL integration replay: 11 passed, two live-provider cases skipped in that replay. Existing confirmation, ownership and concurrency protections passed.
- A separate live-provider run exercised all three reported turns against a disposable local database: real draft, retained image/500,000 price, leather/dimensions refinement, same pending draft for “1”, no published post. Receipt: `C:/Homeji/output/verification/agent-real-full-flow.json`. That run initially failed an additional record equality assertion comparing collection references; the assertion was corrected to structural JSON equality and the database replay passed. The live-provider calls were not repeated after that assertion-only correction.
- Frontend unit suite: 480 passed; targeted ESLint and production build passed.
- `tests/agent-context-flow.e2e.mjs`: desktop and mobile browser flow passed with mocked API responses, including exactly one confirmation request only after the explicit button. This validates the UI contract, not a production publication. Screenshots use a fixture image.

## Limits

No real production post was published for QA. An expired draft or missing image after history reload can require uploading the image again. Premium remains required; ordinary chat cannot bypass entitlement. Deployment health and assets must be verified separately from local checks.
