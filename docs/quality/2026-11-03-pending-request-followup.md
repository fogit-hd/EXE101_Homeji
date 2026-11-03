# Pending-request follow-up

## Completed in this pass

- Public data audit: 132 active source rentals, all 132 cover URLs returned recognizable image bytes. There were 105 source pins with coordinates; 27 entries remain available in the list without guessed pins.
- Audited 181 distinct listing-cover entries across rentals and marketplace: 178 valid image responses, three unavailable covers. The three marketplace entries contained five Cloudinary URLs returning 404, including their secondary images. An exact-match SQL maintenance transaction removed only those five media references after backing up marketplace posts/media and producing restore SQL. All three posts remain active; independent public detail API readback confirms zero remaining broken media references. No substitute product photo, account or coordinate was invented.
- Advanced-marker `gmp-click` now uses DOM event registration/removal for source, rental and marketplace markers, as required by [Google's marker reference](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers). Listener ownership is separate from visual-content disposal so selecting/restyling a marker does not disable subsequent clicks.
- NSO asset review: used only `NsoServer/Data/Img/Map/3/bg/bg013.png` as decorative garden scenery in the existing optional memory game. The copied file is `public/games/nso-garden.png`, 97,718 bytes, SHA-256 `919d52a618404a6a7c9745cb855265b7ff81c29f7e84b2db600bb031cba4a573`. It loads with the game, has reserved dimensions and empty decorative alternative text. Other map tiles, combat effects and character sheets were not added to housing or chat screens.
- Copy search found no remaining UI strings matching the requested obsolete Enter/Shift+Enter hint, “tin tham khảo”, “Ngày tham gia được…” or “Thanh toán một lần”. Gemini provider disclosures remain in privacy explanations; they are not brand logos.

## Verification

Frontend: 480 unit tests, production build and targeted ESLint passed. Source-cluster test first failed on the deprecated event API, then passed with actual DOM event dispatch and listener disposal. The actual RentalMap fixture passed 17-listing/Premium cluster tests, mobile list selection, DOM clicks after marker restyling and entitlement expiry. The game fixture passed perfect-game completion, return to AI response, reduced motion and lost-context fallback. Its old renderer-name assertion was updated to `webgl-refraction`; idle checking now waits for bounded motion to settle before asserting no further draws.

Ignored receipts: `output/verification/pending-requests/`, `glass-game/results.json`, and `vip-cluster/`. Database snapshots/restore SQL are under backend `output/data-import/rental-repair-20261103-121157` and the apply-run snapshot `rental-repair-20261103-121240`.

## Still not signed off

- Additional Agent checks exposed and fixed “đăng tìm/tuyển” routing and renter roommate authorization. Backend now shares its author policy between normal forms and Agent. 694 unit tests and 11 isolated PostgreSQL tests passed. The extra four-case provider run returned ExternalServiceUnavailableException after the fixes, so those four live cases remain unverified. Earlier sofa/rental provider receipts are separate evidence; they are not counted as proof for these extra cases.
- Authenticated production admin download and real Google OAuth round trip require an accessible signed-in session. The available in-app Homeji session is anonymous; a minimized Chrome window could not be read by the UI tool. No credentials are requested in chat.
- Source coordinate refresh fetched all 27 missing-coordinate listing pages; the conservative extractor found no attributable listing-map coordinate. They remain in the list. No coordinates were fabricated or borrowed from the source website's office.
- Physical-phone performance and microphone end-to-end checks remain unverified. Desktop viewport emulation is not physical-device evidence.
- Arbitrary page-backdrop refraction is not implemented for every button. Tab rails have a scoped scene-sampling WebGL renderer; ordinary button tiles shade known solid paint and keep native labels above the material. That scope must not be reported as whole-page optical capture.
- Payment testing remains excluded per the user's later instruction to skip it. No production payment was initiated.
