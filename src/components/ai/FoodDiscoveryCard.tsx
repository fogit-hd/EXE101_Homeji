import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ChatbotFoodContext, ChatbotFoodResponse } from '../../api/types'
import { AddressAutocomplete, type PlaceResult } from '../map/AddressAutocomplete'
import './FoodDiscoveryCard.css'

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export function FoodDiscoveryCard({ data, busy, onSearch, onOpen }: {
  data: ChatbotFoodResponse; busy: boolean; onSearch: (origin: ChatbotFoodContext) => void; onOpen: () => void
}) {
  const id = useId()
  const [address, setAddress] = useState('')
  const [place, setPlace] = useState<PlaceResult | null>(null)
  const [radius, setRadius] = useState(data.origin?.radiusKm ?? 3)
  const [choosing, setChoosing] = useState(data.status === 'locationRequired')
  return <section className="ai-food" aria-label="Gợi ý món ăn từ Chợ Homeji">
    <div className="ai-food__heading"><strong>Món ăn trên Homeji</strong><span>{data.origin ? `Trong ${data.origin.radiusKm} km từ mốc đã chọn` : 'Chưa lọc theo vị trí'}</span></div>
    {data.keyword || data.maxPrice != null ? <p className="ai-food__filters">{[data.keyword && `Từ khóa: ${data.keyword}`, data.maxPrice != null && `Giá món tối đa ${money(data.maxPrice)}`].filter(Boolean).join(' · ')}</p> : null}
    {data.items.length ? <ol className="ai-food__items">{data.items.map((item, index) => <li key={item.id} className="ai-food__item">
      <span className="ai-food__number" aria-hidden="true">{index + 1}</span>
      <div className="ai-food__info"><h4>{item.title}</h4><strong className="ai-food__price">{money(item.price)} <small>/ {item.unit || 'món'}</small></strong>
        <p>{item.sellerName}</p><p className="ai-food__meta">{[`${item.availableQuantity} ${item.unit || 'món'} theo tin`,
          item.preparationMinutes != null && `Chuẩn bị ~${item.preparationMinutes} phút`,
          item.distanceKm != null && `${item.distanceKm.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km đường thẳng`].filter(Boolean).join(' · ')}</p>
        <Link className="ai-food__open" to={`/?section=marketplace&market=food&seller=${encodeURIComponent(item.sellerId)}&item=${encodeURIComponent(item.id)}`} onClick={onOpen}>Xem món & thực đơn <span aria-hidden="true">↗</span></Link>
      </div>
    </li>)}</ol> : null}
    <p className="ai-food__note">Theo tin người bán; số lượng có thể thay đổi. Giá chưa gồm phí giao và khoản khác. Homeji chưa xác nhận khẩu vị hay thành phần món.</p>
    {data.status !== 'clarificationRequired' ? <>
      {!choosing ? <button type="button" className="ai-food__location-button" onClick={() => setChoosing(true)} disabled={busy}>{data.origin ? 'Đổi mốc / bán kính' : 'Chọn mốc để tìm gần bạn'}</button> :
        <form className="ai-food__location" onSubmit={event => { event.preventDefault(); if (place && !busy) onSearch({ latitude: place.lat, longitude: place.lng, radiusKm: radius }) }}>
          <label htmlFor={`${id}-address`}>Tìm quanh địa chỉ hoặc mốc</label>
          <AddressAutocomplete id={`${id}-address`} value={address} disabled={busy} placeholder="Nhập và chọn địa chỉ gợi ý…"
            onChange={value => { setAddress(value); setPlace(null) }} onPlaceSelect={value => { setAddress(value.address); setPlace(value) }} />
          <div className="ai-food__location-actions"><label htmlFor={`${id}-radius`}>Bán kính<select id={`${id}-radius`} value={radius} disabled={busy} onChange={event => setRadius(Number(event.target.value))}>{[1, 3, 5, 10].map(value => <option key={value} value={value}>{value} km</option>)}</select></label>
            <button type="submit" disabled={!place || busy}>Tìm quanh mốc này</button></div>
          <small>Chọn một địa chỉ gợi ý để xác định tọa độ. Vị trí chỉ gửi khi bạn bấm tìm.</small>
        </form>}
    </> : null}
  </section>
}
