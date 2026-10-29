# Chat media and Premium presentation

The emoji picker contains seven categorized Unicode collections, loaded locally without an external emoji service. GIF messages and the picker display no provider/creator attribution at the user's explicit request. This differs from GIPHY's attribution requirements. GIF requests and image URLs remain direct to GIPHY.

Call waiting and incoming ringtones are synthesized locally with Web Audio. Ringing stops on acceptance, connection, cancellation, timeout and teardown. Browsers can block incoming sound before the first page interaction; outgoing calls unlock audio during the button gesture.

Premium decoration uses the server-provided entitlement flag: a gold avatar crown/ring, gold conversation surface, readable badge and profile styling. Conversation categories use distinct filled tags. Reduced-motion preferences disable glimmer animation. The animated stars use `public/images/chat/premium-stars.png` from the user-supplied `nsoz.zip`, entry `NsoServer/Data/Img/Effect/1/22.png` (13×42 pixels). Four vertically packed frames (13×13, 13×13, 9×9 and 7×7) are cropped in CSS and sequenced with discrete keyframes. Three stars use staggered phases with a 1.2-second cycle (previously 2.4 seconds) around each Premium badge; the source atlas stays unchanged. CSS gives the blue source a warm gold tint. Reduced-motion mode holds a single small frame without animation. Other archive content consists primarily of ninja-game sprites/source and is not included. No archive executables or server configuration were run or imported.

Voice recordings use the private conversation attachment API. See the backend `docs/chat-features.md` for the format, authorization and limits. The recorder is remounted when the selected conversation or call-busy state changes, so active/pending microphone resources are released before another thread or call takes over.


## Rental listing and map coverage

`RentalPostService.SearchAsync` derives `isOwnerPremium` from an active subscription and sorts Premium owners before boost score, saves and views. Detail reads expose the same entitlement. This is an owner subscription, not a separate paid pin for each post. Existing ranking is preserved.

`PremiumStars` (React) and `createPremiumStarsElement` (plain DOM for Google Maps) share `PremiumStars.css` and the same sprite atlas. The reusable listing `PremiumBadge` covers `RentalPostCard`, `MapListingCard`, `MapExploreListingCard`, `MapListingsWorkspace` cards/selected preview, AI rental results and payment previews. `MapExplorePinPreview` and `MapPlaceDetailPanel` use it too. Detail rendering honors the explicit latest boolean instead of inferring Premium from a badge string.

`RentalMap` forwards the strict server flag to both `createRentalPinContent` and `createPricePillPinContent`, and includes it in the marker style key so expiry/renewal rebuilds the visual. A gold outline/glow and stars distinguish Premium while preserving room/roommate colors, price text, selection, coordinates and hit targets. Cluster bubbles stay aggregate location counts. Marketplace listings have no rental-owner Premium flag and do not inherit the treatment from a seller name. Stars are decorative, ignore pointer events, use CSS only (no render/timer loop), and stop under reduced motion or forced colors.

Local verification uses a clearly labeled fixture with both pin types and a Premium card. The supplied live viewport was inspected and contained no Premium-marked cards at verification time, so it was not altered to manufacture a production example.
