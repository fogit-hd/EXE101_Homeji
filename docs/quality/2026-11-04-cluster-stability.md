# Cluster first-click stability and settled viewport updates - 2026-11-04

The real RentalMap fixture reproduced the first cluster click opening then losing all 17 visible cards: a pending wheel gesture was consumed by InfoWindow's automatic pan/idle, which updated the parent URL. Source markers were then rebuilt for navigation/query identity changes, and every cluster refresh closed its popup.

Changes:
- Opening a cluster consumes the pending search gesture and cancels its pending area report. InfoWindow can still pan to remain visible; that automatic camera move does not start a new search.
- Intentional viewport idle waits 350ms. A new drag/wheel/keyboard gesture replaces the pending report. Callback changes and map teardown cancel it. Existing parent bounds deduplication and request cancellation remain in place.
- Wheel/key events in the popup's room list or other controls do not mark the map as moved.
- Source filter identity excludes UI routing state. Marker callbacks read current navigation/selection actions without recreating marker resources.
- Source markers reconcile by listing ID: retained markers survive area updates, removed markers release listeners/visual resources, and changed price/title/position patches the existing marker. Cluster ownership clears only when the source layer stops.
- Cluster refresh preserves the open snapshot when its members remain in inventory. A real filter/removal that excludes a selected member closes the obsolete list. Unchanged marker instances are not cleared/re-added to the clusterer. Premium indicators and explicit Premium filtering remain unchanged.

Regression: `node tests/map-cluster-stability.e2e.mjs` failed before the fix (0 cards instead of 17 after first-click auto-pan). It now passes first-click persistence, popup scroll isolation, four quick gestures producing one settled area callback, retained source marker instance counts, same-inventory response stability, native selection, 17/2-Premium filters, 1100/390/320px layouts, zoom, entitlement expiry and actual filter removal. The Google Maps boundary is simulated; no claim of physical-device FPS follows from these results.

Existing vip-cluster and source-room-stability browser regressions passed. All 481 unit/contract tests passed; targeted map/source tests passed again after the final gesture guard. Production build, bundle budget, targeted ESLint and diff whitespace checks were also run. Ignored screenshots: `output/verification/map-cluster-stability/`; logs: `qa-cluster-stability-*.log`.

Deployment readback: live entry `/assets/main-byB_cp6f.js`, HomePage chunk `/assets/HomePage-Bvpejxpr.js` contains the 350ms settled callback, overlay-gesture guard and incremental marker ownership. Receipt: `output/verification/map-cluster-stability/release.json`. A read-only production guest Google Maps browser loaded a map but found no visible cluster in that guest inventory; a real authenticated production cluster interaction is therefore not claimed. The deterministic first-click/pan regression uses the actual application component and a simulated Maps boundary.
