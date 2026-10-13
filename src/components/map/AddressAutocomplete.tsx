import { useEffect, useId, useRef, useState } from 'react'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import {
  fetchPlacePredictions,
  resolvePlaceCoordinates,
  type PlacePredictionItem,
} from '../../lib/placeAutocomplete'
import { useDismissOnOutside } from '../../lib/useDismissOnOutside'
import './AddressAutocomplete.css'

export type PlaceResult = {
  address: string
  lat: number
  lng: number
}

type Props = {
  id?: string
  value: string
  onChange: (address: string) => void
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Address autocomplete via Place API (New) — AutocompleteSuggestion.
 * Does not use legacy google.maps.places.Autocomplete / PlacesService.
 */
export function AddressAutocomplete({
  id,
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Nhập địa chỉ phòng trọ...',
  className = 'form-input',
  required,
  disabled = false,
}: Props) {
  const { apiKey, isLoaded } = useGoogleMaps()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  const onPlaceSelectRef = useRef(onPlaceSelect)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PlacePredictionItem[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [resolving, setResolving] = useState(false)
  const selectionVersion = useRef(0)
  const disabledRef = useRef(disabled)
  useEffect(() => {
    onChangeRef.current = onChange
    onPlaceSelectRef.current = onPlaceSelect
    disabledRef.current = disabled
  }, [onChange, onPlaceSelect, disabled])
  const [selectionScope, setSelectionScope] = useState({ value, disabled })
  if (selectionScope.value !== value || selectionScope.disabled !== disabled) {
    if (selectionScope.disabled !== disabled) setOpen(false)
    setSelectionScope({ value, disabled })
    setResolving(false)
  }
  useEffect(() => {
    selectionVersion.current += 1
    return () => { selectionVersion.current += 1 }
  }, [disabled, value])
  useDismissOnOutside(open, [rootRef], () => {
    setOpen(false)
    inputRef.current?.blur()
  })

  useEffect(() => {
    const q = value.trim()
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (disabled || !isLoaded || !apiKey || q.length < 2) {
        setItems([])
        setLoading(false)
        return
      }
      setLoading(true)
      void fetchPlacePredictions(q, { limit: 6 }).then((next) => {
        if (cancelled) return
        setItems(next)
        setLoading(false)
        setActiveIndex(next.length ? 0 : -1)
      }).catch(() => {
        if (cancelled) return
        setItems([])
        setLoading(false)
      })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [value, isLoaded, apiKey, disabled])

  const pick = async (item: PlacePredictionItem) => {
    if (disabledRef.current) return
    const version = ++selectionVersion.current
    setOpen(false)
    setResolving(true)
    try {
      const resolved = await resolvePlaceCoordinates(item.placeId)
      if (version !== selectionVersion.current || disabledRef.current) return
      if (resolved) {
        const address = resolved.address || resolved.name || item.title
        onChangeRef.current(address)
        onPlaceSelectRef.current({
          address,
          lat: resolved.lat,
          lng: resolved.lng,
        })
      } else {
        onChangeRef.current(item.title)
      }
    } catch {
      // Keep manual address entry usable if the optional provider lookup fails.
      if (version === selectionVersion.current) setOpen(false)
    } finally {
      if (version === selectionVersion.current) setResolving(false)
    }
  }

  const showList = !disabled && open && (loading || items.length > 0 || value.trim().length >= 2)

  return (
    <div ref={rootRef} className="address-autocomplete">
      <input
        id={id}
        ref={inputRef}
        className={className}
        value={value}
        onChange={(e) => {
          selectionVersion.current += 1
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={
          !apiKey
            ? placeholder
            : !isLoaded
              ? 'Đang tải Google Maps...'
              : resolving
                ? 'Đang lấy tọa độ…'
                : placeholder
        }
        required={required}
        disabled={disabled || (apiKey ? !isLoaded || resolving : false)}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        onKeyDown={(e) => {
          if (!showList || items.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => (i + 1) % items.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
          } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault()
            void pick(items[activeIndex])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />

      {showList ? (
        <ul id={listId} className="address-autocomplete__list" role="listbox">
          {loading && items.length === 0 ? (
            <li className="address-autocomplete__empty" role="option" aria-disabled>
              Đang gợi ý địa chỉ…
            </li>
          ) : null}
          {!loading && items.length === 0 ? (
            <li className="address-autocomplete__empty" role="option" aria-disabled>
              Không tìm thấy địa chỉ phù hợp
            </li>
          ) : null}
          {items.map((item, index) => (
            <li key={item.placeId} role="none">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`address-autocomplete__item${
                  index === activeIndex ? ' is-active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void pick(item)}
              >
                <span className="address-autocomplete__item-title">{item.title}</span>
                {item.subtitle ? (
                  <span className="address-autocomplete__item-sub">{item.subtitle}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
