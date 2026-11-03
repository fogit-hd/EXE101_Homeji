# Unified rental presentation — 03/11/2026

Room previews from imported rental markers and member rental markers now render RentalMapPreview. Imported marker and cluster selection delegates to the map's React preview instead of opening the old rental InfoWindow. Food place InfoWindows retain their own behavior. Source preview data never invents Premium, verification, user accounts, or supported member-only mutations.

RoomDetailModal and SourceRoomDetail share RoomDetailHeader, RoomEssentials, PhotoGallery and the same room-detail layout/styles. The source view uses the same summary → essentials → gallery → costs → description structure, independent desktop contact column, mobile stack, and fixed contact footer. Contact capabilities remain explicit: source phone reveal is authenticated, supports multiple real numbers and missing/retry states; unsupported internal messaging/scheduling is not presented as an operational action.

PhotoGallery's cancel propagation is contained so Escape closes only the image viewer first. Source detail uses the same regular overlay layer as member detail, allowing the product's login modal to remain interactive above it. Escape and keyboard focus remain handled without dismissing an authentication modal.

Validation: 476 existing tests pass. Six shared-flow browser cases cover native/source × 320/390/1280px, shared layout, actual gallery/lightbox interactions, close, no fabricated Premium, source phone requests and fixed desktop contact. Separate source regression covers 320–1440px, missing phones, request failure/retry and Escape. Cluster test verifies selection delegates to shared preview. Fixture API/auth are isolated and do not establish a production login or real owner identity.
