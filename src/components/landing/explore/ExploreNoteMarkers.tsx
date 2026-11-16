import { useEffect, useMemo, useRef } from 'react'
import type { NearbyListingItem } from './nearbyListings'

type Props = {
  items: NearbyListingItem[]
  enabled: boolean
  activeId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

type PinGroup = {
  key: string
  lat: number
  lng: number
  ids: string[]
  numbers: number[]
}

type MountedPin = {
  marker: google.maps.marker.AdvancedMarkerElement
  el: HTMLButtonElement
  group: PinGroup
}

type MapWindow = Window & { __HOMEJI_MAP?: google.maps.Map }

/** Rooms sharing one coordinate (same building) share one pin: "1" or "1+2". */
function groupByCoordinate(items: NearbyListingItem[]): PinGroup[] {
  const groups = new Map<string, PinGroup>()
  items.forEach((item, index) => {
    const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`
    const group = groups.get(key)
    if (group) {
      group.ids.push(item.id)
      group.numbers.push(index + 1)
    } else {
      groups.set(key, { key, lat: item.lat, lng: item.lng, ids: [item.id], numbers: [index + 1] })
    }
  })
  return [...groups.values()]
}

/** "4" for one room, "1, 2, 3" for a few in one building, "23 +7" for many. */
function fillPinLabel(el: HTMLElement, group: PinGroup) {
  const { numbers } = group
  if (numbers.length <= 3) {
    el.textContent = numbers.join(', ')
    return
  }
  el.textContent = String(numbers[0])
  const more = document.createElement('small')
  more.textContent = `+${numbers.length - 1}`
  el.append(more)
}

/**
 * Numbered note pins on the live RentalMap instance. The number on a pin is the
 * number of its note in the list, so the map and the list can be read together.
 */
export function ExploreNoteMarkers({ items, enabled, activeId, onHover, onSelect }: Props) {
  const groups = useMemo(() => groupByCoordinate(items), [items])
  const pinsRef = useRef<MountedPin[]>([])
  const handlersRef = useRef({ onHover, onSelect })

  useEffect(() => {
    handlersRef.current = { onHover, onSelect }
  }, [onHover, onSelect])

  useEffect(() => {
    if (!enabled || groups.length === 0) return undefined
    let cancelled = false
    let timer = 0

    const attach = () => {
      if (cancelled) return
      const map = (window as MapWindow).__HOMEJI_MAP
      const Advanced = typeof google !== 'undefined' ? google.maps?.marker?.AdvancedMarkerElement : undefined
      if (!map || !Advanced) {
        timer = window.setTimeout(attach, 250)
        return
      }
      pinsRef.current = groups.map(group => {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'explore-pin'
        fillPinLabel(el, group)
        el.setAttribute(
          'aria-label',
          group.numbers.length > 1
            ? `Phòng số ${group.numbers.join(', ')} trên bản đồ`
            : `Phòng số ${group.numbers[0]} trên bản đồ`,
        )
        el.addEventListener('mouseenter', () => handlersRef.current.onHover(group.ids[0]))
        el.addEventListener('mouseleave', () => handlersRef.current.onHover(null))
        el.addEventListener('click', event => {
          event.stopPropagation()
          handlersRef.current.onSelect(group.ids[0])
        })
        const marker = new Advanced({
          map,
          position: { lat: group.lat, lng: group.lng },
          content: el,
          zIndex: 10 + (groups.length - group.numbers[0]),
        })
        return { marker, el, group }
      })
    }

    attach()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      pinsRef.current.forEach(({ marker }) => { marker.map = null })
      pinsRef.current = []
    }
  }, [enabled, groups])

  useEffect(() => {
    pinsRef.current.forEach(({ marker, el, group }) => {
      const hot = activeId !== null && group.ids.includes(activeId)
      el.classList.toggle('is-hot', hot)
      marker.zIndex = hot ? 1000 : 10 + (groups.length - group.numbers[0])
    })
  }, [activeId, groups])

  return null
}
