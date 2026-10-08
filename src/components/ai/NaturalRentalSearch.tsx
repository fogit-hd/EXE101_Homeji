import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { highlightRentalPosts, type AiHighlightResponse, type AiParsedSearchCriteria } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { getErrorMessage } from '../../lib/errors'
import { AiSearchReview } from './AiSearchReview'
import { RentalSourceBrowser } from './RentalSourceBrowser'
import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import './NaturalRentalSearch.css'

export function NaturalRentalSearch() {
  const { profile } = useAuth()
  return <NaturalRentalSearchSession key={profile?.id ?? 'guest'} />
}

function NaturalRentalSearchSession() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [result, setResult] = useState<AiHighlightResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const previous = useRef<AiParsedSearchCriteria | undefined>(undefined)
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
  return <div className="natural-rental-search">
    <button ref={opener} type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen(value => !value)}>Tìm phòng bằng nhu cầu</button>
    {open ? <section className="natural-rental-search__panel" role="dialog" aria-label="Tìm phòng bằng nhu cầu" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); opener.current?.focus() }
    }}>
      <button type="button" className="natural-rental-search__close" aria-label="Đóng tìm theo nhu cầu" onClick={() => { setOpen(false); opener.current?.focus() }}>×</button>
      <form onSubmit={event => { event.preventDefault(); void submit() }}>
        <label htmlFor="natural-rental-query">Mô tả và sửa nhu cầu của bạn</label>
        <textarea id="natural-rental-query" autoFocus maxLength={1000} value={text} disabled={loading} onChange={event => { setText(event.target.value); setResult(null) }} placeholder="2 người, dưới 4 triệu tiền thuê, có bếp, không ở ghép" rows={3} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !text.trim()}>{loading ? 'Đang tìm…' : 'Hiểu nhu cầu và tìm tin'}</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={() => { previous.current = undefined; setResult(null); setText(''); setError('') }}>Bắt đầu nhu cầu mới</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {result ? <AiSearchReview result={result} onRefine={value => { setText(value); setResult(null) }} onApply={update => { setOpen(false); navigate('/?section=listings', { state: { aiSearchUpdate: update } }) }} /> : null}
      {aiFeatureFlags.sourceBrowser ? <RentalSourceBrowser /> : null}
    </section> : null}
  </div>
}
