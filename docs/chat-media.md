# Chat media and Premium presentation

The emoji picker contains seven categorized Unicode collections, loaded locally without an external emoji service. GIF messages show concise plain-text provider/creator credit instead of a hyperlink and long title. The picker retains GIPHY attribution; GIF requests and image URLs remain direct to GIPHY.

Call waiting and incoming ringtones are synthesized locally with Web Audio. Ringing stops on acceptance, connection, cancellation, timeout and teardown. Browsers can block incoming sound before the first page interaction; outgoing calls unlock audio during the button gesture.

Premium decoration uses the server-provided entitlement flag: a gold avatar crown/ring, gold conversation surface, readable badge and profile styling. Conversation categories use distinct filled tags. Reduced-motion preferences disable glimmer animation. The tiny glimmer asset `public/images/chat/premium-glimmer.png` comes from the user-supplied `nsoz.zip`, entry `NsoServer/Data/Img/Small/1/Small612.png` (16×16 pixels, 495 bytes). Other archive content consists primarily of ninja-game sprites/source and is not included. No archive executables or server configuration were run or imported.

Voice recordings use the private conversation attachment API. See the backend `docs/chat-features.md` for the format, authorization and limits. The recorder is remounted when the selected conversation or call-busy state changes, so active/pending microphone resources are released before another thread or call takes over.
