import { SuperClusterAlgorithm } from '@googlemaps/markerclusterer'

/** Position caching must not hide changes to a listing's Premium entitlement. */
export class ListingClusterAlgorithm extends SuperClusterAlgorithm {
  private listingDataChanged = false

  invalidateListings() { this.listingDataChanged = true }

  override calculate(input: Parameters<SuperClusterAlgorithm['calculate']>[0]) {
    const result = super.calculate(input)
    const changed = result.changed || this.listingDataChanged
    this.listingDataChanged = false
    return { ...result, changed }
  }
}
