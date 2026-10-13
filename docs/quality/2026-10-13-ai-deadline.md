# AI request deadline — 2026-10-13

Issues: frontend #26, backend thanhduykx/Homeji_BE#21.

Production Flash-Lite was verified in Render request logs, but the HTTP/HTTPS question still hit the generic 20-second frontend deadline. AI parse/search/chatbot/draft requests now allow 40 seconds; other requests remain at 20 seconds. Abandoned searches still cancel immediately. Backend provider retries now share a maximum 30-second deadline, including backoff and body reads, leaving time for application processing and transport.

Four actual API-wrapper tests failed before the fix when a simulated successful reply arrived after 25 seconds. All seven focused tests pass after it, covering ordinary timeout, AI timeout and caller cancellation. The isolated production build, focused lint and all 209 Node tests passed. Existing unrelated UI work was excluded from the build and release.

The backend change bounds retries, rather than extending every attempt. Provider availability and cold starts can still cause a fallback; this release does not guarantee Gemini answers every request.
