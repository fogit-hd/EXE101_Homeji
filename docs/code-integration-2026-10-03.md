# Preserve the new Homeji UI while restoring existing features

## Inputs and boundaries

- Frontend baseline: `d81e0cb`, containing the newer marketplace, profile,
  roommate, global-search, hub and listings/room-modal design.
- Earlier completed features: manager analytics, website traffic, automatic nearby
  Google Places, map-camera cancellation, legal pages and checkout confirmation.
- Backend has substantial uncommitted marketplace/security/configuration work.
  No backend source files were edited, reverted, staged or committed in this integration.
- No reset, checkout replacement, stash, repository cleanup or database mutation was used.

## Integration

- Keep SearchProvider, ToastProvider, GoogleOAuthRoot and the new application chrome.
  Restore traffic tracking inside router/auth boundaries and `/privacy`, `/terms`.
- Restore manager overview within the new PageFrame and tab structure. Its request
  failure/loader is independent of moderation data, with a retry button.
- Keep MapListingsWorkspace, price-pill map markers and RoomDetailModal. Add the
  automatic orange nearby panel to that map destination and restore native Google
  place selection. Selecting a nearby result does not replace the rental anchor.
- Extend the new global header search, rather than replacing it with the legacy
  omnibox. Nearby categories use the selected rental/place anchor; Google suggestions
  route by place ID and are resolved on the map. Late overview fitting must not
  override explicit place focus. URL filters are retained.
- Restore cancellation of stale/pending device-location focus when choosing pins,
  retaining the new URL cleanup logic. Restore deep-zoom overlap clustering.
- Keep the refactored Google client configuration module with environment override
  and the previously configured public production identifier as fallback.
- Keep the redesigned food cart, adding an explicit confirmation before its order
  mutation. Confirmation displays quantity, total and pickup location.
- Preserve the existing uncropped legacy-thumbnail and corner badge/price contract,
  retaining the new card title/address formatting.

## Verification

Current production TypeScript/Vite build passes. All 53 frontend checks pass; these
are a mix of source contracts and executable helpers/callbacks, not 53 browser tests.
The new integration tests execute the actual header-place selection callback and
verify retained URL filters. Existing map-camera tests execute the restored callback
bodies, including the new clear-selection branch context.

Backend current working tree: 117 application tests and 55 API integration tests
pass; 6 opt-in database tests are skipped, not counted as passing. New frontend
search/header files pass scoped lint. AdminModerationPage has a pre-existing
Fast Refresh warning promoted to an error for its exported report helper; that
unrelated export was preserved.

## Still outside completion

This integration does not claim that the approximately 100 real rental listings or
their photos have been crawled/imported. The user specified multiple websites and
Quận 9–Thủ Đức only. Database cleanup, source provenance, duplicate/geographic
validation, photo reuse and the actual import still require their own execution and
verification. Sample records must not silently become "verified real" just because
display labels are cleaned. No production data was changed in this step.
