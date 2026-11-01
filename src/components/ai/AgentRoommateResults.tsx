import { Link } from 'react-router-dom'
import type { AgentRoommateCandidate } from '../../api/chatbotAgent'
import { formatPrice } from '../../lib/labels'
export function AgentRoommateResults({ items, onOpen }: { items: AgentRoommateCandidate[]; onOpen: () => void }) {
  if (!items.length) return null
  return <section className="chatbot-nearby-results" aria-label="Hồ sơ đang tìm ở ghép">{items.map(item => <Link key={item.userId} to="/?section=invitations" onClick={onOpen}><strong>{item.displayName}</strong><span>{item.preferredArea || 'Chưa cung cấp khu vực'}</span><small>{item.maxBudget ? `Ngân sách ${formatPrice(item.maxBudget)}/tháng` : 'Chưa cung cấp ngân sách'}</small>{item.introduction ? <span>{item.introduction}</span> : null}<small>{item.compatibilityScore == null ? 'Chưa đủ thông tin so sánh thói quen' : `Tương đồng thói quen đã khai: ${item.compatibilityScore}%`}</small><span>Xem danh sách & gửi lời mời ↗</span></Link>)}</section>
}
