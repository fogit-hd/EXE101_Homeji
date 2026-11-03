# Normal Chat and Agent separation

Normal Chat remains selected after an image/selling request. Backend now generates ordinary text/media guidance, returns no Agent draft and suggests the appropriate manual form. Basic users get an optional Premium suggestion; Premium users are invited to select Agent. It does not execute an action based on inferred posting intent alone.

The transcript renders the upgrade/manual action pair once instead of repeating the manual action through the generic navigation list. No purchase or posting endpoint is triggered by the suggestion.

Browser checks: `tests/normal-chat-guidance.e2e.mjs` passed Basic/Premium at 390 dark and 1366 light with a fixture photo. It asserts normal-mode transport, no draft sidebar/publication action, Chat stays selected, one manual action and no upgrade CTA for Premium. `tests/agent-context-flow.e2e.mjs` now explicitly selects Agent and verifies the existing real-draft contract and confirmation lifecycle. API responses are mocked, not production publications. Frontend unit suite, build and targeted lint passed separately.
