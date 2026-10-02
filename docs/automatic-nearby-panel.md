# Automatic nearby suggestions

A single rental-marker click now selects the rental and opens its detail plus the
amber nearby panel. Native Google map POIs also open the panel after place details
provide valid coordinates; no Homeji listing is required. Both authenticated and
guest map surfaces use the same coordinate/context helper. Selecting a new pin
resets dismissal and the default category. Closing the panel suppresses it for the
current selection; clicking a pin again or the optional Nearby shortcut reopens it.

Results come from Google Places Nearby Search (New), not Homeji rental/marketplace
records: food, cafes/bakeries, groceries and healthcare, within 1.8 km, distance
ranking, at most eight returned places, five-minute in-memory cache. Selecting a
native Google POI excludes that same POI from its nearby recommendations. Coordinates
are validated and mismatched previous rental details cannot anchor the new selection.
The optional Nearby shortcut remains useful after closing the panel; it is no longer
required to start discovery. Automatic opening increases Places requests; bounding,
short caching and selecting one category at a time limit duplicate usage. Google
coverage/quota failures are surfaced with retry and empty states, not invented data.

Reference: https://developers.google.com/maps/documentation/javascript/nearby-search

## Verification (2026-10-03)

- Production build passes and six nearby tests pass (three behavioral anchor tests,
  three existing source-contract checks).
- Scoped lint passes for the shell, nearby panel and new helper. GuestMapSection has
  two pre-existing set-state-in-effect lint failures, confirmed against its HEAD version;
  unrelated fetching behavior was not changed to hide these warnings.
- Live desktop 1440x950: one click on the sample Hoang Dieu 2 rental opens both panels
  without clicking Nearby; Google restaurants appear with names, addresses and distances.
- Clicking native Google POIs Neko - Bake & Brew and Com Ga Ut Sa opens their original
  Google details and updates the nearby panel automatically. Close remains effective.
- Local evidence (not committed): output/verification/nearby_auto_pin.jpg and
  output/verification/nearby_auto_google_place.jpg.
- Final self-POI exclusion needs deployment confirmation.
