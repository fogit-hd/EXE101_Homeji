import { useEffect, useRef, useState } from 'react'
import { locateForChat, type ChatbotLocation } from '../../lib/chatbotLocation'
import { AddressAutocomplete } from '../map/AddressAutocomplete'
import './ChatbotLocationControl.css'

export function ChatbotLocationControl({ value, onChange, disabled }: { value: ChatbotLocation | null; onChange: (value: ChatbotLocation | null) => void; disabled: boolean }) {
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const panel = useRef<HTMLDetailsElement>(null)
  useEffect(() => () => { generation.current++ }, [])
  function close() { if (panel.current) panel.current.open = false }
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (panel.current?.open && event.target instanceof Node && !panel.current.contains(event.target)) panel.current.open = false }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  async function locate() {
    if (busy || disabled) return
    const current = ++generation.current
    setBusy(true); setError('')
    try { const location = await locateForChat(); if (current === generation.current) { onChange(location); close() } }
    catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : 'Chưa lấy được vị trí.') }
    finally { if (current === generation.current) setBusy(false) }
  }
  return <details ref={panel} className="chatbot-location-control" data-glass-exclude onKeyDown={event => { if (event.key === 'Escape') { close(); panel.current?.querySelector('summary')?.focus(); event.stopPropagation() } }}>
    <summary onClick={event => { if (disabled) event.preventDefault() }}><span aria-hidden>⌖</span><span>{value ? value.address?.split(',').slice(0, 2).join(',') || 'Vị trí hiện tại' : 'Chọn vị trí'}</span><small>{value ? 'Thay đổi' : 'Tùy chọn'}</small></summary>
    <div className="chatbot-location-control__panel">
      <button type="button" disabled={disabled || busy} onClick={() => void locate()}>{busy ? 'Đang định vị…' : 'Dùng vị trí hiện tại'}</button>
      <AddressAutocomplete value={address} onChange={setAddress} onPlaceSelect={place => { generation.current++; setBusy(false); setError(''); setAddress(place.address); onChange({ latitude: place.lat, longitude: place.lng, address: place.address, capturedAt: new Date().toISOString(), accuracyMeters: null }); close() }} disabled={disabled} placeholder="Chọn địa chỉ khác" />
      {value ? <button className="chatbot-location-control__clear" type="button" disabled={disabled} onClick={() => { generation.current++; setBusy(false); onChange(null); setAddress(''); setError(''); close() }}>Ngừng dùng vị trí</button> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </details>
}
