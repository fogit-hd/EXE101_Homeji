import { useEffect, useRef } from 'react'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { importPlacesLibrary } from '../../lib/loadGoogleMaps'
import './AddressAutocomplete.css'

export type PlaceResult = {
  address: string
  lat: number
  lng: number
}

type Props = {
  value: string
  onChange: (address: string) => void
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  required?: boolean
}

function collectScrollParents(el: HTMLElement): Array<HTMLElement | Window> {
  const out: Array<HTMLElement | Window> = [window]
  let node: HTMLElement | null = el.parentElement
  while (node) {
    const style = getComputedStyle(node)
    const oy = style.overflowY
    const ox = style.overflowX
    const o = style.overflow
    if (
      /(auto|scroll|overlay)/.test(oy) ||
      /(auto|scroll|overlay)/.test(ox) ||
      /(auto|scroll|overlay)/.test(o)
    ) {
      out.push(node)
    }
    node = node.parentElement
  }
  return out
}

/** Keep .pac-container glued to the input when a scroll parent moves. */
function syncPacPosition(input: HTMLElement) {
  const pac = document.querySelector('.pac-container') as HTMLElement | null
  if (!pac) return
  if (getComputedStyle(pac).display === 'none') return

  const rect = input.getBoundingClientRect()
  // Skip tiny off-screen inputs (panel closed).
  if (rect.width < 8 || rect.bottom < 0 || rect.top > window.innerHeight) return

  pac.classList.add('pac-container--anchored')
  pac.style.setProperty('position', 'fixed', 'important')
  pac.style.setProperty('left', `${Math.round(rect.left)}px`, 'important')
  pac.style.setProperty('top', `${Math.round(rect.bottom + 4)}px`, 'important')
  pac.style.setProperty('width', `${Math.round(rect.width)}px`, 'important')
  pac.style.setProperty('right', 'auto', 'important')
  pac.style.setProperty('transform', 'none', 'important')
  pac.style.setProperty('margin-top', '0', 'important')
}

/**
 * Places Autocomplete via official google.maps.places — no vis.gl hooks.
 * Repositions the body-level `.pac-container` on scroll so it stays under the input.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Nhập địa chỉ phòng trọ...',
  className = 'form-input',
  required,
}: Props) {
  const { apiKey, isLoaded } = useGoogleMaps()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  onChangeRef.current = onChange
  onPlaceSelectRef.current = onPlaceSelect

  useEffect(() => {
    if (!isLoaded || !apiKey || !inputRef.current) return

    let cancelled = false
    let autocomplete: google.maps.places.Autocomplete | null = null
    let listener: google.maps.MapsEventListener | null = null
    let mo: MutationObserver | null = null
    let pacStyleMo: MutationObserver | null = null
    let raf = 0
    let syncing = false
    const input = inputRef.current
    const scrollParents = collectScrollParents(input)

    const runSync = () => {
      if (cancelled || syncing) return
      syncing = true
      try {
        syncPacPosition(input)
        const pac = document.querySelector('.pac-container')
        if (pac && !pacStyleMo) {
          pacStyleMo = new MutationObserver(() => {
            if (!syncing) scheduleSync()
          })
          pacStyleMo.observe(pac, { attributes: true, attributeFilter: ['style'] })
        }
      } finally {
        syncing = false
      }
    }

    const scheduleSync = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(runSync)
    }

    void (async () => {
      const places = await importPlacesLibrary()
      if (cancelled || !inputRef.current || !places.Autocomplete) return

      autocomplete = new places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'vn' },
        fields: ['formatted_address', 'geometry', 'name'],
      })

      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete?.getPlace()
        const location = place?.geometry?.location
        if (!location) return

        const address = place.formatted_address ?? inputRef.current?.value ?? ''
        onChangeRef.current(address)
        onPlaceSelectRef.current({
          address,
          lat: location.lat(),
          lng: location.lng(),
        })
      })

      for (const parent of scrollParents) {
        parent.addEventListener('scroll', scheduleSync, { passive: true, capture: true })
      }
      window.addEventListener('resize', scheduleSync)

      mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n instanceof HTMLElement && n.classList.contains('pac-container')) {
              scheduleSync()
            }
          }
        }
      })
      mo.observe(document.body, { childList: true })

      input.addEventListener('focus', scheduleSync)
      input.addEventListener('keydown', scheduleSync)
      input.addEventListener('input', scheduleSync)
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (listener) google.maps.event.removeListener(listener)
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete)
      mo?.disconnect()
      pacStyleMo?.disconnect()
      for (const parent of scrollParents) {
        parent.removeEventListener('scroll', scheduleSync, true)
      }
      window.removeEventListener('resize', scheduleSync)
      input.removeEventListener('focus', scheduleSync)
      input.removeEventListener('keydown', scheduleSync)
      input.removeEventListener('input', scheduleSync)
    }
  }, [isLoaded, apiKey])

  if (!apiKey) {
    return (
      <div ref={wrapRef} className="address-autocomplete">
        <input
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div ref={wrapRef} className="address-autocomplete">
        <input
          className={className}
          value={value}
          disabled
          placeholder="Đang tải Google Maps..."
          required={required}
        />
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="address-autocomplete">
      <input
        ref={inputRef}
        className={className}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
    </div>
  )
}
