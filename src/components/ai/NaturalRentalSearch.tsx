import { useMotionPresence } from '../motion/useMotionPresence'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { highlightRentalPosts, type AiHighlightResponse, type AiParsedSearchCriteria } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { getErrorMessage } from '../../lib/errors'
import { AiSearchReview } from './AiSearchReview'
import { RentalSourceBrowser } from './RentalSourceBrowser'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import './NaturalRentalSearch.css'

type NaturalRentalSearchProps = {
  query?: string
  onOpen?: () => void
  renderTrigger?: (trigger: ReactNode) => ReactNode
}

export function NaturalRentalSearch(props: NaturalRentalSearchProps) {
  const { profile } = useAuth()
  return <NaturalRentalSearchSession key={profile?.id ?? 'guest'} {...props} />
}

function NaturalRentalSearchSession({ query = '', onOpen, renderTrigger }: NaturalRentalSearchProps) {
  const [open, setOpen] = useState(false)
  const { present, ...presence } = useMotionPresence(open)
  const [text, setText] = useState('')
  const [result, setResult] = useState<AiHighlightResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const previous = useRef<AiParsedSearchCriteria | undefined>(undefined)
  const seededQuery = useRef('')
  const request = useRef(0)
  const opener = useRef<HTMLButtonElement>(null)
  const identity = useRef<string | null>(null)
  const { profile, isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  useEffect(() => () => { request.current += 1 }, [])
  const submit = async () => {
    if (!text.trim() || loading) return
    if (!isAuthenticated) { authModal.openAuthModal({ intent: 'chatbot' }); return }
    if (identity.current !== profile?.id) { previous.current = undefined; identity.current = profile?.id ?? null }
    const current = ++request.current
    setLoading(true); setError(''); setResult(null)
    try {
      const reply = await highlightRentalPosts({ text: text.trim(), maxResults: 5, previousCriteria: previous.current })
      if (request.current === current) { previous.current = reply.criteria; setResult(reply) }
    } catch (reason) {
      if (request.current === current) setError(getErrorMessage(reason, 'Chưa tìm được theo nhu cầu. Bạn có thể dùng bộ lọc thông thường hoặc thử lại.'))
    } finally { if (request.current === current) setLoading(false) }
  }
  const trigger = <button ref={opener} type="button" className="natural-rental-search__trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls="natural-rental-search-panel" onClick={() => {
    if (!open) {
      // A new search-bar query starts fresh; reopening a refinement keeps its criteria.
      if (query.trim() && query.trim() !== seededQuery.current) {
        request.current += 1; previous.current = undefined; setLoading(false)
        setText(query.slice(0, 1000)); setResult(null); setError('')
      }
      seededQuery.current = query.trim()
      onOpen?.()
    }
    setOpen(value => !value)
  }}>Gợi ý AI</button>
  return <div className="natural-rental-search">
    {renderTrigger ? renderTrigger(trigger) : trigger}
    {present ? <section {...presence} id="natural-rental-search-panel" className={`natural-rental-search__panel${loading ? ' is-thinking' : ''}`} role="dialog" aria-busy={loading} aria-label="Gợi ý AI tìm phòng" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); opener.current?.focus() }
    }}>
      <button type="button" className="natural-rental-search__close" aria-label="Đóng tìm theo nhu cầu" onClick={() => { setOpen(false); opener.current?.focus() }}>×</button>
      <h2>Gợi ý AI tìm phòng</h2>
      <p>Mô tả ngân sách, số người và tiện ích. Xem các tin phù hợp và xác nhận tiêu chí trước khi áp dụng.</p>
      <form onSubmit={event => { event.preventDefault(); void submit() }}>
        <label htmlFor="natural-rental-query">Mô tả và sửa nhu cầu của bạn</label>
        <textarea id="natural-rental-query" autoFocus maxLength={1000} value={text} disabled={loading} onChange={event => { setText(event.target.value); setResult(null) }} placeholder="2 người, dưới 4 triệu tiền thuê, có bếp, không ở ghép" rows={3} />
        <button type="submit" className="btn btn-primary btn-sm ai-spectrum-button" disabled={loading || !text.trim()}>{loading ? 'Đang tìm…' : 'Hiểu nhu cầu và tìm tin'}</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={() => { previous.current = undefined; setResult(null); setText(''); setError('') }}>Bắt đầu nhu cầu mới</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {result ? <AiSearchReview result={result} onRefine={value => { setText(value); setResult(null) }} onApply={update => { setOpen(false); navigate('/?section=listings', { state: { aiSearchUpdate: update } }) }} /> : null}
      {aiFeatureFlags.sourceBrowser ? <RentalSourceBrowser /> : null}
    </section> : null}
  </div>
}
