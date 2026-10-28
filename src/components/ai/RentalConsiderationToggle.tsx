import { useRentalJourney } from '../../contexts/rental-journey'
import { MAX_RENTAL_CHOICES } from '../../lib/rentalJourney'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import './RentalJourney.css'

export function RentalConsiderationToggle({ post, compact = false }: { post: { id: string; title: string }; compact?: boolean }) {
  const journey = useRentalJourney()
  if (!aiFeatureFlags.decisionTools || !journey?.enabled) return null
  const selected = journey.choices.some(item => item.postId === post.id)
  const full = journey.choices.length >= (journey.maxChoices ?? MAX_RENTAL_CHOICES)
  return <button type="button" className="btn btn-secondary btn-sm rental-journey-toggle" aria-pressed={selected}
    aria-label={`${selected ? 'Bỏ khỏi cân nhắc' : 'Thêm vào cân nhắc'} · ${post.title}`}
    disabled={!selected && full} title={!selected && full ? 'Bỏ một lựa chọn để thêm phòng khác' : selected ? 'Nhấn để bỏ phòng này khỏi cân nhắc' : undefined}
    onClick={() => journey.toggle({ postId: post.id, title: post.title })}>
    {compact ? <span aria-hidden="true">{selected ? '✓' : '+'}</span> : null}{compact ? selected ? 'Đang cân nhắc' : 'Cân nhắc' : selected ? 'Bỏ khỏi cân nhắc' : 'Thêm vào cân nhắc'}
  </button>
}
