# Floating AI thinking capsule

The previous status was an inline transcript row, so it could scroll out of view. The request status now floats at the bottom of a dedicated transcript viewport. A reserved bottom inset keeps the latest message clear of the capsule; the composer and stop action remain accessible.

`ThinkingCapsule` renders only while the real request is pending. It has an opaque theme-aware text surface, a seven-color animated edge and a moving spectrum orb. The decoration ignores pointer input. Reduced motion freezes the animations; forced colors preserves a plain readable status. No additional API request or timer simulates progress.

Validation: the browser regression uses the actual chatbot with mocked API responses on desktop/light and mobile/dark. It checks popup position outside the scroller, clearance above the composer, animation preferences and disappearance on response, cancellation and error. The existing draft revision and explicit publication assertions also pass. Production build, targeted ESLint and 480 unit tests passed. Screenshots use a fixture image; no production listing was posted.
