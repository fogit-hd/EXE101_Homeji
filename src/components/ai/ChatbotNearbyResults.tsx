import { Link } from 'react-router-dom'
import { sourceRoomHref } from '../../api/rentalSources'
import { formatPrice } from '../../lib/labels'
import type { ChatbotNearbyResponse } from '../../api/chatbotAgent'
export type { ChatbotNearbyResponse } from '../../api/chatbotAgent'
export function ChatbotNearbyResults({ data, onOpen }: { data: ChatbotNearbyResponse; onOpen: () => void }) {
  if (!data.items.length) return null
  return <section className="chatbot-nearby-results" aria-label="Phòng quanh vị trí của bạn">{data.items.map(item => <Link key={`${item.imported}:${item.id}`} to={item.imported ? sourceRoomHref(item.id) : `/?section=listings&post=${encodeURIComponent(item.id)}`} onClick={onOpen}><strong>{formatPrice(item.price)} / tháng</strong><span>{item.title}</span><small>{item.address}</small><small>{item.area} m² · cách khoảng {item.distanceKm.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km đường thẳng</small></Link>)}</section>
}
