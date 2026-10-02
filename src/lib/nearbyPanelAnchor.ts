type ListingLocation = { id: string; title: string; latitude?: number | null; longitude?: number | null }
type PlaceLocation = { placeId: string; name: string; location: { lat: number; lng: number } | null }

export type NearbyPanelAnchor = { contextKey: string; label: string; lat: number; lng: number; placeId?: string }

/** Never reuse a previously fetched rental's coordinates for the new selection. */
export function nearbyPanelAnchor(
  selectedPostId: string | null,
  listing: ListingLocation | null,
  place: PlaceLocation | null,
): NearbyPanelAnchor | null {
  if (selectedPostId) {
    if (!listing || listing.id !== selectedPostId || !validCoordinates(listing.latitude, listing.longitude)) return null
    return { contextKey: selectedPostId, label: listing.title, lat: listing.latitude!, lng: listing.longitude! }
  }
  if (!place?.location || !validCoordinates(place.location.lat, place.location.lng)) return null
  return { contextKey: place.placeId, placeId: place.placeId, label: place.name, ...place.location }
}

function validCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}
