import type { MapClusterKind } from './mapLocationPins'
import './ClusterListings.css'

export type ClusterListing = {
  id: string
  kind: MapClusterKind
  title: string
  address: string
  priceLabel: string
  imageUrl?: string | null
  premium: boolean
  open: () => void
}

export type CatalogClusterMarker = { marker: google.maps.marker.AdvancedMarkerElement; listing: ClusterListing }

/** Preserve the total inventory; VIP is an explicit filter, not an implicit sort. */
export function createClusterListings(listings: ClusterListing[], onZoom: () => void): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'map-cluster-listings'
  root.setAttribute('data-glass-exclude', '')
  const heading = document.createElement('strong')
  heading.textContent = `${listings.length} tin trong khu vực này`
  const toolbar = document.createElement('div')
  toolbar.className = 'map-cluster-listings__toolbar'
  const zoom = document.createElement('button')
  zoom.type = 'button'; zoom.textContent = 'Phóng to khu vực'
  zoom.addEventListener('click', onZoom)
  const list = document.createElement('div')
  list.className = 'map-cluster-listings__list'
  const cards = listings.map(listing => {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'map-cluster-listings__card'
    card.addEventListener('click', listing.open)
    if (listing.imageUrl) {
      try {
        const url = new URL(listing.imageUrl, window.location.origin)
        if (url.protocol === 'https:' || url.origin === window.location.origin) {
          const image = document.createElement('img')
          image.src = url.href; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'
          image.addEventListener('error', () => image.remove(), { once: true })
          card.append(image)
        }
      } catch { /* Missing images must not hide a listing. */ }
    }
    const body = document.createElement('span')
    const title = document.createElement('strong'); title.textContent = listing.title
    const price = document.createElement('b'); price.textContent = listing.priceLabel
    const address = document.createElement('span'); address.textContent = listing.address
    if (listing.premium) {
      const badge = document.createElement('small'); badge.className = 'map-cluster-listings__vip'; badge.textContent = '★ VIP'
      body.append(badge)
    }
    body.append(title, price, address); card.append(body)
    list.append(card)
    return { card, premium: listing.premium }
  })
  const premiumCount = listings.filter(row => row.premium).length
  if (premiumCount > 0) {
    const filter = document.createElement('button')
    filter.type = 'button'; filter.className = 'map-cluster-listings__filter'
    filter.textContent = `Xem VIP (${premiumCount})`; filter.setAttribute('aria-pressed', 'false')
    filter.addEventListener('click', () => {
      const vipOnly = filter.getAttribute('aria-pressed') !== 'true'
      filter.setAttribute('aria-pressed', String(vipOnly))
      filter.textContent = vipOnly ? `Xem tất cả (${listings.length})` : `Xem VIP (${premiumCount})`
      for (const item of cards) item.card.hidden = vipOnly && !item.premium
    })
    toolbar.append(filter)
  }
  toolbar.append(zoom); root.append(heading, toolbar, list)
  return root
}
