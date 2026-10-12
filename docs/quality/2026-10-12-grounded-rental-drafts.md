# Rental draft provenance and confirmation

Requirement: AI product opportunities item 7. Backend tracking: [Homeji_BE #15](https://github.com/thanhduykx/Homeji_BE/issues/15).

The draft assistant now explains that Gemini suggests presentation from owner inputs and does not verify rent, amenities or room availability. Existing preview, explicit apply, stale-input protection and separate save/submit actions remain required. The public request and response contracts stay unchanged while the backend restricts generation to validated composition choices rendered from source facts.

Frontend verification: production build and focused ESLint for RentalDraftAssistant pass. This is a copy clarification; it does not establish backend grounding or live provider behavior. Backend behavioral tests and production checks are recorded separately.

Deployment targets remain https://exe101-homeji.onrender.com/ and https://homeji-be.onrender.com/. Advanced Routes and long-term chatbot history remain off.
