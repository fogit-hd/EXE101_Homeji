# Cancel abandoned AI requests

Tracking: [FE #18](https://github.com/fogit-hd/EXE101_Homeji/issues/18). Related independent correctness work: [BE #14](https://github.com/thanhduykx/Homeji_BE/issues/14).

Search previously ignored late results but left requests running after its popup closed or the user navigated away. Draft generation had the same unmount behavior. Both API helpers now accept an optional AbortSignal. Search aborts on close, Escape, toggle-close, replacement query and unmount. Draft generation aborts on unmount, collapsing its assistant, or the new explicit cancel button. Existing request IDs continue preventing late responses from changing state. Preview and user confirmation remain required before changing form contents.

The production Node API proxy propagates a downstream disconnect by destroying its upstream request/response. It listens to aborted uploads and unfinished outgoing-response closure, rather than the incoming request's normal close event. Normal completed POST uploads still receive their response. Intentional cancellation produces neither a synthetic 502 nor socket-error logging. A real upstream failure returns JSON 502 before headers, or terminates a partial response after headers.

## Verification

- 185 Node tests pass. Seven real child-process HTTP proxy cases cover pre-header cancellation, stream cancellation, incomplete upload, three normal POSTs, real pre-header failure and truncated upstream response with a subsequent healthy request. The focused proxy suite also passed three additional race-check runs.
- Production build and focused ESLint for the two modified UI components, proxy and proxy tests pass. This does not claim repository-wide ESLint is clean.
- Edge local browser against an opt-in delayed fake API recorded six requests: search close and search unmount cancelled; draft cancel, draft collapse and draft unmount cancelled; drafting again after cancellation completed normally. The existing form title remained unchanged without applying the preview. Audit: ignored output/quality/full-audit/cancellation-browser-audit.json. Screenshot: cancellation-draft-browser.png in the same directory.

Provider cancellation and resource savings are best effort. These checks establish local browser-to-upstream transport cancellation, not token billing savings or propagation through Render to the remote provider. No API request/response body contract changes, migrations or database writes are introduced. Existing callers may omit the new signal. WebSocket and static-serving behavior are unchanged.

Advanced Routes and long-term history remain off. Deployment targets remain https://exe101-homeji.onrender.com/ and https://homeji-be.onrender.com/.
