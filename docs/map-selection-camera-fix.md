# Pin selection supersedes stale camera focus

## Cause

HomePage previously retained the last explicit camera focus (including device
location). Selecting a rental incremented focusToken without clearing that focus.
RentalMap prioritizes explicit focus before rental/place selection, so it replayed
the old coordinates. Native Google selection also retained the old parent focus.
A pending device-location request could additionally resolve after a newer selection
and overwrite it.

## Change

A shared cancellation callback clears the previous focus, bumps its revision and
invalidates the pending device-location request when a rental is selected or map
selection is cleared (including the start of native Google POI selection). The stored
device position is not erased. A subsequent explicit My Location request can still
focus it. Nearby discovery and its selected anchor are unchanged.

## Evidence on 2026-10-03

- Three regression tests execute the actual HomePage callback bodies and RentalMap
  camera-selection branches with lightweight state/camera stubs. Two failed before
  the fix: rental selection replayed the old coordinates and native selection retained
  old focus. All three pass afterward, including explicit My Location focus behavior.
- Production build passes. HomePage lint remains at the same pre-existing baseline:
  ten errors and one warning, confirmed against the prior committed version.
- Production deployed bundle contains the location-request cancellation callback.
- Live browser: search FPT school focuses map at 10.841128,106.809883; selecting the
  native Passio Coffee pin changes camera to 10.841688,106.809323 and opens its Google
  details plus nearby panel. No device-location permission was requested/granted.
- Evidence: output/verification/map_camera_selected_google_pin.jpg (local only).
- Device geolocation itself was not exercised in the browser; the pending-request
  cancellation and stored-focus behavior are covered by the callback tests.

## Overall-goal audit

The Admin product overview is live with supply/demand map, daily line chart, 7/30/90
periods, advisory pricing, traffic panel and data-provenance caveats. These were
re-observed during this continuation. Completion of the overall manager-facing UX
goal was not declared by this camera fix alone. The subsequent requirement-by-requirement
manager-facing audit is recorded in `admin-product-analytics.md`, including live map
selection, all chart metrics, period reconciliation and advisory-price safeguards.
