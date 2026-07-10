import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useEffect, useRef } from 'react'
import { useGoogleMaps } from '../../contexts/GoogleMapsProvider'

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

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Nhập địa chỉ phòng trọ...',
  className = 'form-input',
  required,
}: Props) {
  const { apiKey, isLoaded } = useGoogleMaps()
  const placesLib = useMapsLibrary('places')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'vn' },
      fields: ['formatted_address', 'geometry', 'name'],
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const location = place.geometry?.location
      if (!location) return

      const address = place.formatted_address ?? value
      onChange(address)
      onPlaceSelect({
        address,
        lat: location.lat(),
        lng: location.lng(),
      })
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [placesLib, onChange, onPlaceSelect, value])

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

  if (!isLoaded || !placesLib) {
    return (
      <input
        className={className}
        value={value}
        disabled
        placeholder="Đang tải Google Maps..."
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
