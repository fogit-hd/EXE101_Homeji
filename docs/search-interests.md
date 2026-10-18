# Personalized new-room discovery

`SearchInterestCenter` mounts once inside the router for authenticated users. Its owner-keyed
child resets component state on account changes. The “Phòng mới” dialog separates ordinary
personalization, Gemini and daily email consent. All default to off.

`searchInterestCapture.ts` observes explicit `section=listings` URL searches only, excluding
marketplace, map-only movement and post-detail links. It captures the chosen keyword/place
and hard filters; it never reads geolocation. Search sessions are account-scoped in tab
sessionStorage, reused on reload, and renewed after thirty minutes of inactivity. The backend
requires three distinct sessions in seven days before proposing an area.

The user confirms criteria before following; the address autocomplete can resolve an explicit
place for a radius. Manual text areas remain usable without Maps, with less precise text
matching. Budget is rent, not total living cost. AI can propose criteria and rank eligible
rooms on request; it never follows automatically or relaxes backend constraints.

Controls include dismiss thirty days, remove follow, refresh rooms, clear history with
confirmation, and disable personalization (which clears follows). `?interest=manage` opens
the dialog from digest emails. Clear history keeps follows but resets seen markers.

Validation: `node --test tests/search-interest-capture.test.mjs`, focused ESLint and production
build. Browser fixture under ignored `output/interest-fixture.*` exercises the actual component
with synthetic API data; it does not call Gemini or send email. Backend integration tests
provide the matching, consent, notification and email-cadence evidence separately.
