# In-tab housing search state and clean navigation - 2026-11-04

User clarification: remove coordinates/filters from the address bar; preserve the existing GET API contract. No backend, database or search endpoint changes are included.

Housing criteria now live in one observable store shared by the map shell, HomePage data loader, list controls, source-marker layer, header search and optional search-interest observer. Criteria are serialized as versioned, allowlisted JSON in sessionStorage for this tab, with memory-only fallback if storage is unavailable. Raw stored payloads are bounded at 16 KiB; unknown/invalid stored fields are ignored. This store is not an authorization mechanism.

`useListingSearchParams` adapts existing controls to that store. Filter-only updates notify subscribers without a router navigation or new history entry. Functional updates read the latest shared snapshot to retain concurrent changes. Short navigation fields (section, view, catalog and selected room IDs) remain in the URL; coordinates, prices, amenities, keyword and place criteria do not.

Legacy housing links are imported once and replaced with their short navigation URL. Import runs after the router attaches its history listener; the browser regression exposed lost router updates when attempted in a child layout effect. Invalid/disabled cache data cannot block search. Reloading the same tab restores its criteria; a clean URL shared into another tab does not carry those criteria. Feature-specific queries for marketplace, invitations, payments and OAuth retain their existing routing contract.

Header text/place suggestions and the opt-in interest observer read the same in-tab criteria. Selecting/closing a room retains filters. Clearing text removes text/place criteria; clearing all filters removes the search snapshot. The recent cluster auto-pan fix, 350ms viewport settle window and incremental markers remain active.

Validation:
- `listing-search-session.e2e.mjs`: real BrowserRouter, SearchProvider, shared controls, API client and SourceRoomDetailsHost at 1366/390px. Covers initial legacy import, header text/place selection, shared updates, unchanged history for pan/filter operations, GET query transport, room open/close, reload, Back, explicit reset and unrelated marketplace routing. API calls are local fixtures, not production writes.
- Seven store tests cover routing eligibility, navigation/payment field retention, restoration/reset, tab isolation, blocked storage, malformed/oversized cache, legacy precedence and subscriptions.
- Existing cluster, source detail/navigation, normal Chat and mobile discovery browser fixtures pass. Mobile discovery covers 320/390/430/1280px, including dark mode.
- Unit fixtures were updated at the moved state seam while preserving their assertions on account isolation, source markers, area filters and search-context drafts.
- Full unit/contract suite, build, bundle budget and targeted lint are recorded in `qa-search-session-release-*.log`.

Additional QA finding: the expanded AI readability script initially lost its first launcher click before the lazy chat subscribed. The separate launcher change queues only the latest open/close intent until subscription; two focused tests and the normal-chat browser fixture cover it. The expanded readability script then reached its older keyboard-order assertion (privacy Tab -> new conversation), which does not match the current toolbar order; that complete script is not claimed as passing in this release. No chat layout or focus order was changed to satisfy an obsolete assertion.
