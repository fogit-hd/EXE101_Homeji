import { useEffect, useRef } from 'react'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'
import { importPlacesLibrary } from '../../lib/loadGoogleMaps'

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

/**
 * Places Autocomplete via official google.maps.places — no vis.gl hooks.
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
    })()

    return () => {
      cancelled = true
      if (listener) google.maps.event.removeListener(listener)
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete)
    }
  }, [isLoaded, apiKey])

  if (!apiKey) {
    return (
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    )
  }

  if (!isLoaded) {
    return (
      <input
        className={className}
        value={value}
        disabled
        placeholder="Đang tải Google Maps..."
        required={required}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      className={className}
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
    />
  )
}
