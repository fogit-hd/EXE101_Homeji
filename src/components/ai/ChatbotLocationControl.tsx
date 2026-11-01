import { useEffect, useRef, useState } from 'react'
import { locateForChat, type ChatbotLocation } from '../../lib/chatbotLocation'
import { AddressAutocomplete } from '../map/AddressAutocomplete'
import './ChatbotLocationControl.css'

export function ChatbotLocationControl({ value, onChange, disabled }: { value: ChatbotLocation | null; onChange: (value: ChatbotLocation | null) => void; disabled: boolean }) {
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [])
  async function locate() {
    if (busy || disabled) return
    const current = ++generation.current
    setBusy(true); setError('')
    try { const location = await locateForChat(); if (current === generation.current) onChange(location) }
    catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : 'Chưa lấy được vị trí.') }
    finally { if (current === generation.current) setBusy(false) }
  }
  return <details className="chatbot-location-control">
    <summary><span aria-hidden>⌖</span><span>{value ? value.address || 'Đã chọn vị trí thiết bị' : 'Vị trí · chưa chia sẻ'}</span><small>{value ? 'Đổi' : 'Thêm vị trí'}</small></summary>
    <div><p>Chia sẻ vị trí trong phiên chat để tìm phòng, món ăn quanh bạn và điền bản nháp. Địa chỉ chỉ công khai sau khi bạn xác nhận đăng bài.</p>
      <button type="button" disabled={disabled || busy} onClick={() => void locate()}>{busy ? 'Đang lấy vị trí…' : 'Dùng vị trí của tôi'}</button>
      <AddressAutocomplete value={address} onChange={setAddress} onPlaceSelect={place => { generation.current++; setBusy(false); setError(''); setAddress(place.address); onChange({ latitude: place.lat, longitude: place.lng, address: place.address, capturedAt: new Date().toISOString(), accuracyMeters: null }) }} disabled={disabled} placeholder="Hoặc chọn địa chỉ bạn muốn dùng" />
      {value ? <><small>{value.accuracyMeters != null ? `Sai số thiết bị khoảng ${Math.round(value.accuracyMeters)} m. ` : ''}{value.accuracyMeters != null && value.accuracyMeters > 1000 ? 'Vị trí chưa đủ chính xác để tự điền địa chỉ đăng bán; hãy chọn địa chỉ.' : 'Kiểm tra lại địa chỉ trong bản nháp trước khi đăng.'}</small><button type="button" disabled={disabled} onClick={() => { generation.current++; setBusy(false); onChange(null); setAddress('') }}>Ngừng chia sẻ vị trí</button></> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </details>
}
