import { useEffect, useId, useRef, useState } from 'react'
import { useGoogleMaps } from "../../contexts/GoogleMapsProvider.logic"

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
  const { apiKey, isLoaded, loadError } = useGoogleMaps()
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
  const [lookupError, setLookupError] = useState('')
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
      setLookupError('')
      void fetchPlacePredictions(q, { limit: 6, throwOnError: true }).then((next) => {
        if (cancelled) return
        setItems(next)
        setLoading(false)
        setActiveIndex(next.length ? 0 : -1)
      }).catch(() => {
        if (cancelled) return
        setItems([])
        setLoading(false)
        setLookupError('Chưa tải được gợi ý địa chỉ. Bạn có thể nhập đầy đủ địa chỉ rồi chọn vị trí trên bản đồ.')
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
      const resolved = await resolvePlaceCoordinates(item.placeId, { throwOnError: true })
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
        setItems([])
        setLookupError('Chưa tìm được vị trí của địa chỉ này. Hãy chọn vị trí trên bản đồ.')
        setOpen(true)
      }
    } catch {
      // Keep manual address entry usable if the optional provider lookup fails.
      if (version === selectionVersion.current) {
        setItems([])
        setLookupError('Chưa lấy được vị trí. Hãy thử chọn lại địa chỉ hoặc chọn vị trí trên bản đồ.')
        setOpen(true)
      }
    } finally {
      if (version === selectionVersion.current) setResolving(false)
    }
  }

  const showList = !disabled && open && (loading || items.length > 0 || value.trim().length >= 2)

  return (
    <div ref={rootRef} className="address-autocomplete" data-glass-exclude>
      <input
        id={id}
        ref={inputRef}
        className={className}
        value={value}
        onChange={(e) => {
          selectionVersion.current += 1
          setItems([])
          setActiveIndex(-1)
          setLookupError('')
          setLoading(e.target.value.trim().length >= 2 && isLoaded && !!apiKey)
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
        disabled={disabled}
        aria-busy={resolving || loading}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 && activeIndex < items.length ? `${listId}-option-${activeIndex}` : undefined}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); return }
          if (e.key === 'Tab') { setOpen(false); return }
          if (items.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActiveIndex((i) => (i + 1) % items.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
            setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
          } else if (e.key === 'Enter' && showList && activeIndex >= 0) {
            e.preventDefault()
            void pick(items[activeIndex])
          }
        }}
      />

      {showList ? (
        <ul id={listId} className="address-autocomplete__list" role="listbox" aria-label="Gợi ý địa chỉ" aria-busy={loading}>
          {loading && items.length === 0 ? (
            <li className="address-autocomplete__empty" role="presentation">
              <span role="status">Đang gợi ý địa chỉ…</span>
            </li>
          ) : null}
          {!loading && items.length === 0 ? (
            <li className="address-autocomplete__empty" role="presentation">
              <span role="status">{lookupError || (loadError || !apiKey
                ? 'Gợi ý địa chỉ chưa dùng được. Bạn vẫn có thể nhập địa chỉ thủ công.'
                : !isLoaded ? 'Đang tải gợi ý địa chỉ…'
                : 'Chưa tìm thấy địa chỉ. Hãy nhập số nhà, tên đường và phường/xã.')}</span>
            </li>
          ) : null}
          {items.map((item, index) => (
            <li key={item.placeId} role="none">
              <button
                type="button"
                role="option"
                id={`${listId}-option-${index}`}
                tabIndex={-1}
                onMouseDown={event => event.preventDefault()}
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
