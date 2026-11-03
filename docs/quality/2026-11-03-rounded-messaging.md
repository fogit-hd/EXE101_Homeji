# Messaging square-frame follow-up

The actual `MapMessagesPanel`, complete application appearance layers and both glass engines were mounted with fixture conversations and grouped sent/received messages. Existing message-wrapper transparency passed; inbox rows still failed with computed `border-radius: 0`.

Changed the existing inbox row rule to a transparent idle surface with 14 px corners. The list now has 4 px separation and no rectangular bottom dividers. Hover/active colors and Premium styling remain authored by their existing rules. No messaging, read-state or authorization behavior changed.

`node tests/chat-rounded.e2e.mjs` failed before the CSS change on the zero-radius inbox cell and passed afterward at 390/1366 px in light/dark themes. It also checks grouped message radii, transparent outer wrappers, lack of a second shadow/glass layer, overflow and browser errors. `tests/chat-incoming.e2e.mjs` and production build passed. API data is mocked; no real message was sent. The open in-app Homeji tab was anonymous, so an authenticated production conversation was not visually verified.
