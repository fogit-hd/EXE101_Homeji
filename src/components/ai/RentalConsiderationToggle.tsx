import { useRentalJourney } from '../../contexts/rental-journey'
import { MAX_RENTAL_CHOICES } from '../../lib/rentalJourney'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import './RentalJourney.css'

export function RentalConsiderationToggle({ post }: { post: { id: string; title: string } }) {
  const journey = useRentalJourney()
  if (!aiFeatureFlags.decisionTools || !journey?.enabled) return null
  const selected = journey.choices.some(item => item.postId === post.id)
  const full = journey.choices.length >= MAX_RENTAL_CHOICES
  return <button type="button" className="btn btn-secondary btn-sm rental-journey-toggle" aria-pressed={selected}
    disabled={!selected && full} title={!selected && full ? 'Bỏ một lựa chọn để thêm phòng khác' : undefined}
    onClick={() => journey.toggle({ postId: post.id, title: post.title })}>
    {selected ? 'Bỏ khỏi cân nhắc' : 'Thêm vào cân nhắc'}<span className="sr-only"> · {post.title}</span>
  </button>
}
