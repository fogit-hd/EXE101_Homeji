import { Link } from 'react-router-dom'
import { sourceRoomHref } from '../../api/rentalSources'
import { formatPrice } from '../../lib/labels'
import type { ChatbotSourceMatch } from '../../api/chatbotAgent'

/** Numbered in the order the assistant's facts use, so "phòng 2" means the same room on screen and in the reply. */
export function ChatbotSourceResults({ data, startAt, onOpen }: { data: ChatbotSourceMatch; startAt: number; onOpen: () => void }) {
  if (!data.rooms.length) return null
  return <section className="chatbot-nearby-results" aria-label="Phòng khớp yêu cầu của bạn">
    {data.rooms.map((room, index) => <Link key={room.id} to={sourceRoomHref(room.id)} onClick={onOpen}>
      <strong>{startAt + index}. {formatPrice(room.price)} / tháng</strong>
      <span>{room.title}</span>
      <small>{room.address}</small>
      <small>{[room.area > 0 ? `${room.area} m²` : null, room.depositLabel, ...room.amenities.slice(0, 3)].filter(Boolean).join(' · ')}</small>
    </Link>)}
  </section>
}
