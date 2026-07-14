import './MapLocationPins.css'

export type MapPinContentHandle = {
  element: HTMLDivElement
  dispose: () => void
}

/**
 * 0×0 anchor at lat/lng. Each marker class decides whether its visual is
 * centered on the coordinate or lifted so a pin tip touches the coordinate.
 */
function coordinateAnchorRoot(
  title: string,
  className: string,
  options?: { interactive?: boolean },
): {
  root: HTMLDivElement
  mount: HTMLDivElement
} {
  const interactive = options?.interactive ?? false
  const root = document.createElement('div')
  root.className = className
  root.title = title
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText = [
    'width:0',
    'height:0',
    'position:relative',
    'overflow:visible',
    `pointer-events:${interactive ? 'auto' : 'none'}`,
  ].join(';')

  const mount = document.createElement('div')
  mount.className = `${className}__lift`
  if (interactive) mount.style.pointerEvents = 'auto'
  root.appendChild(mount)
  return { root, mount }
}

function formatPinPrice(price?: number): string | null {
  if (price == null || !Number.isFinite(price) || price < 0) return null
  if (price >= 1_000_000) {
    const m = price / 1_000_000
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}tr`
  }
  if (price >= 1000) return `${Math.round(price / 1000)}k`
  return `${Math.round(price)}₫`
}

/** Pin path: tip exactly at (24, 64) — bottom-center of viewBox. */
const PIN_PATH =
  'M24 0C13.5 0 5 8.5 5 19c0 14 19 45 19 45s19-31 19-45C43 8.5 34.5 0 24 0z'

/** Google Maps-style blue dot for the device's current location. */
export function createUserLocationDotContent(options: {
  title?: string
  size?: number
}): MapPinContentHandle {
  const size = options.size ?? 46
  const { root, mount } = coordinateAnchorRoot(
    options.title ?? 'Vị trí của bạn',
    'map-user-location-dot',
  )

  mount.style.width = `${size}px`
  mount.style.height = `${size}px`
  mount.innerHTML = `
    <span class="map-user-location-dot__accuracy" aria-hidden="true"></span>
    <span class="map-user-location-dot__pulse" aria-hidden="true"></span>
    <span class="map-user-location-dot__core" aria-hidden="true"></span>
  `

  return {
    element: root,
    dispose: () => {
      root.remove()
    },
  }
}

/** Blue animated SVG pin for chat “Mở trên bản đồ”. */
export function createChatLocationPinContent(options: {
  title: string
  kindLabel?: string
  size?: number
}): MapPinContentHandle {
  const size = options.size ?? 40
  const visualH = Math.round(size * (64 / 48))
  const { root, mount } = coordinateAnchorRoot(options.title, 'map-chat-pin')

  const badge = document.createElement('div')
  badge.className = 'map-chat-pin__badge'
  const kind = document.createElement('span')
  kind.className = 'map-chat-pin__kind'
  kind.textContent = options.kindLabel?.trim() || 'Từ tin nhắn'
  const name = document.createElement('strong')
  name.className = 'map-chat-pin__title'
  name.textContent = options.title
  badge.appendChild(kind)
  badge.appendChild(name)
  mount.appendChild(badge)

  const pinWrap = document.createElement('div')
  pinWrap.className = 'map-chat-pin__graphic'
  pinWrap.innerHTML = `
    <span class="map-chat-pin__pulse" aria-hidden="true"></span>
    <span class="map-chat-pin__pulse map-chat-pin__pulse--delay" aria-hidden="true"></span>
    <svg class="map-chat-pin__svg" viewBox="0 0 48 64" width="${size}" height="${visualH}" xmlns="http://www.w3.org/2000/svg">
      <path fill="#1A73E8" stroke="#0B57D0" stroke-width="1.4" d="${PIN_PATH}"/>
      <circle cx="24" cy="20" r="9" fill="#fff"/>
      <circle cx="24" cy="20" r="4.5" fill="#1A73E8"/>
    </svg>
  `
  mount.appendChild(pinWrap)

  return {
    element: root,
    dispose: () => {
      root.remove()
    },
  }
}

/**
 * Amber animated SVG pin for Chợ đồ — distinct from green (me) / blue (chat) / red (place).
 * Tip-anchored; pulse + badge when selected (“Xem map”).
 */
export function createMarketplacePinContent(options: {
  title: string
  price?: number
  selected?: boolean
  size?: number
}): MapPinContentHandle {
  const selected = Boolean(options.selected)
  const size = options.size ?? (selected ? 46 : 36)
  const visualH = Math.round(size * (64 / 48))
  const fill = selected ? '#EA580C' : '#F59E0B'
  const stroke = selected ? '#C2410C' : '#D97706'
  const { root, mount } = coordinateAnchorRoot(options.title, 'map-market-pin', {
    interactive: true,
  })
  if (selected) root.classList.add('is-selected')

  const priceLabel = formatPinPrice(options.price)
  if (selected) {
    const badge = document.createElement('div')
    badge.className = 'map-market-pin__badge'
    const kind = document.createElement('span')
    kind.className = 'map-market-pin__kind'
    kind.textContent = 'Chợ đồ'
    const name = document.createElement('strong')
    name.className = 'map-market-pin__title'
    name.textContent = options.title
    badge.appendChild(kind)
    badge.appendChild(name)
    if (priceLabel) {
      const priceEl = document.createElement('span')
      priceEl.className = 'map-market-pin__price'
      priceEl.textContent = priceLabel
      badge.appendChild(priceEl)
    }
    mount.appendChild(badge)
  }

  const pinWrap = document.createElement('div')
  pinWrap.className = 'map-market-pin__graphic'
  pinWrap.innerHTML = `
    <span class="map-market-pin__pulse" aria-hidden="true"></span>
    <span class="map-market-pin__pulse map-market-pin__pulse--delay" aria-hidden="true"></span>
    <svg class="map-market-pin__svg${selected ? ' is-bounce' : ''}" viewBox="0 0 48 64" width="${size}" height="${visualH}" xmlns="http://www.w3.org/2000/svg">
      <path fill="${fill}" stroke="${stroke}" stroke-width="1.4" d="${PIN_PATH}"/>
      <circle cx="24" cy="20" r="11" fill="#fff"/>
      <text x="24" y="24.5" text-anchor="middle" fill="${stroke}" font-size="13" font-weight="800" font-family="system-ui,sans-serif">₫</text>
    </svg>
  `
  mount.appendChild(pinWrap)

  return {
    element: root,
    dispose: () => {
      root.remove()
    },
  }
}

export type RentalPinKind = 'vacant' | 'roommate'

const RENTAL_PIN_THEME: Record<
  RentalPinKind,
  { fill: string; stroke: string; fillSel: string; strokeSel: string; kind: string; glyph: string }
> = {
  vacant: {
    fill: '#84CC16',
    stroke: '#4D7C0F',
    fillSel: '#65A30D',
    strokeSel: '#3F6212',
    kind: 'Phòng trọ',
    glyph: `<path fill="currentColor" d="M24 11.5 13 20.2V33h7.2V26h7.6v7H35V20.2L24 11.5z"/>`,
  },
  roommate: {
    fill: '#6366F1',
    stroke: '#4338CA',
    fillSel: '#4F46E5',
    strokeSel: '#3730A3',
    kind: 'Ở ghép',
    glyph: `<circle cx="18.5" cy="17" r="3.2" fill="currentColor"/><path fill="currentColor" d="M12.5 28.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5v1.2h-12v-1.2z"/><circle cx="29.5" cy="17" r="3.2" fill="currentColor"/><path fill="currentColor" d="M23.5 28.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5v1.2h-12v-1.2z"/>`,
  },
}

/**
 * Tip-anchored teardrop for phòng trọ (green) / tìm bạn ở ghép (indigo).
 */
export function createRentalPinContent(options: {
  kind: RentalPinKind
  title: string
  selected?: boolean
  hot?: boolean
  size?: number
}): MapPinContentHandle {
  const kind = options.kind
  const theme = RENTAL_PIN_THEME[kind]
  const selected = Boolean(options.selected)
  const hot = Boolean(options.hot)
  const size = options.size ?? (selected ? 46 : hot ? 40 : 36)
  const visualH = Math.round(size * (64 / 48))
  const fill = selected ? theme.fillSel : theme.fill
  const stroke = selected ? theme.strokeSel : theme.stroke
  const className = kind === 'roommate' ? 'map-roommate-pin' : 'map-rental-pin'
  const { root, mount } = coordinateAnchorRoot(options.title, className, { interactive: true })
  if (selected) root.classList.add('is-selected')
  if (hot) root.classList.add('is-hot')

  if (selected) {
    const badge = document.createElement('div')
    badge.className = `${className}__badge`
    const kindEl = document.createElement('span')
    kindEl.className = `${className}__kind`
    kindEl.textContent = theme.kind
    const name = document.createElement('strong')
    name.className = `${className}__title`
    name.textContent = options.title
    badge.appendChild(kindEl)
    badge.appendChild(name)
    mount.appendChild(badge)
  }

  const pinWrap = document.createElement('div')
  pinWrap.className = `${className}__graphic`
  pinWrap.innerHTML = `
    <span class="${className}__pulse" aria-hidden="true"></span>
    <span class="${className}__pulse ${className}__pulse--delay" aria-hidden="true"></span>
    <svg class="${className}__svg${selected ? ' is-bounce' : ''}" viewBox="0 0 48 64" width="${size}" height="${visualH}" xmlns="http://www.w3.org/2000/svg" style="color:${stroke}">
      <path fill="${fill}" stroke="${stroke}" stroke-width="1.4" d="${PIN_PATH}"/>
      <circle cx="24" cy="20" r="11" fill="#fff"/>
      <g transform="translate(0,-1)">${theme.glyph}</g>
    </svg>
  `
  mount.appendChild(pinWrap)

  return {
    element: root,
    dispose: () => {
      root.remove()
    },
  }
}
