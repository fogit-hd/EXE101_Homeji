import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { HomejiAgentMark } from './HomejiAgentMark'
import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { highlightRentalPosts, type AiHighlightResponse, type AiParsedSearchCriteria } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from "../../contexts/AuthModalContext.logic"
import { useMotionPresence } from '../motion/useMotionPresence'

import { aiFeatureFlags } from '../../lib/aiFeatureFlags'
import { getErrorMessage } from '../../lib/errors'
import { observeElementResize } from '../../lib/observeElementResize'
import { AiSearchReview } from './AiSearchReview'
import './NaturalRentalSearch.css'
import { RentalSourceBrowser } from './RentalSourceBrowser'

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
  const { present, ...presence } = useMotionPresence(open, 'fade')
  useLayoutEffect(() => {
    if (!present) return
    const panel = presence.ref.current
    const trigger = opener.current
    if (!panel || !trigger) return
    const position = () => {
      const viewport = window.visualViewport
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      const offsetTop = viewport?.offsetTop ?? 0
      const offsetLeft = viewport?.offsetLeft ?? 0
      const anchor = trigger.getBoundingClientRect()
      const field = trigger.closest('.hj-search__field')?.getBoundingClientRect() ?? anchor
      const panelWidth = Math.min(640, width - 32)
      panel.style.setProperty('--search-panel-left', `${Math.max(offsetLeft + 16, Math.min(anchor.right - panelWidth, offsetLeft + width - panelWidth - 16))}px`)
      panel.style.setProperty('--search-panel-top', `${field.bottom + 8}px`)
      panel.style.setProperty('--search-panel-max-height', `${Math.max(0, offsetTop + height - field.bottom - 24)}px`)
      panel.style.setProperty('--search-panel-bottom', `${Math.max(0, window.innerHeight - offsetTop - height) + 16}px`)
      panel.style.setProperty('--search-sheet-max-height', `${Math.max(0, height - 32)}px`)
    }
    position()
    const stopObserving = observeElementResize([trigger, trigger.closest('.hj-search__field') ?? trigger], position)
    window.addEventListener('scroll', position, true)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      stopObserving()
      window.removeEventListener('scroll', position, true)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
    }
  }, [present, presence.ref])
  const [text, setText] = useState('')
  const [asked, setAsked] = useState('')
  const [result, setResult] = useState<AiHighlightResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const previous = useRef<AiParsedSearchCriteria | undefined>(undefined)
  const seededQuery = useRef('')
  const request = useRef(0)
  const pending = useRef<AbortController | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const queryInput = useRef<HTMLTextAreaElement>(null)
  const identity = useRef<string | null>(null)
  const { profile, isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  useEffect(() => () => { request.current += 1; pending.current?.abort() }, [])
  const cancelSearch = () => {
    request.current += 1
    pending.current?.abort()
    pending.current = null
    setLoading(false)
  }
  const close = () => { cancelSearch(); setOpen(false); opener.current?.focus() }
  const submit = async () => {
    if (!text.trim() || loading) return
    if (!isAuthenticated) { authModal.openAuthModal({ intent: 'chatbot' }); return }
    if (identity.current !== profile?.id) { previous.current = undefined; identity.current = profile?.id ?? null }
    const current = ++request.current
    const controller = new AbortController()
    pending.current?.abort()
    pending.current = controller
    setLoading(true); setError(''); setResult(null); setAsked(text.trim()); setText('')
    try {
      const reply = await highlightRentalPosts({ text: text.trim(), maxResults: 5, previousCriteria: previous.current }, controller.signal)
      if (request.current === current) { previous.current = reply.criteria; setResult(reply) }
    } catch (reason) {
      if (request.current === current) setError(getErrorMessage(reason, 'Chưa tìm được theo nhu cầu. Bạn có thể dùng bộ lọc thông thường hoặc thử lại.'))
    } finally { if (request.current === current) { pending.current = null; setLoading(false) } }
  }
  const startOver = () => { cancelSearch(); previous.current = undefined; setResult(null); setText(''); setAsked(''); setError(''); requestAnimationFrame(() => queryInput.current?.focus()) }
  const form = <form className="natural-rental-search__form" onSubmit={event => { event.preventDefault(); void submit() }}>
    <label htmlFor="natural-rental-query" className="natural-rental-search__sr">{asked ? 'Thêm hoặc sửa yêu cầu' : 'Mô tả nhu cầu của bạn'}</label>
    <textarea data-glass-exclude ref={queryInput} id="natural-rental-query" autoFocus maxLength={1000} value={text} disabled={loading} rows={1}
      onChange={event => setText(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit() } }}
      placeholder={asked ? 'Thêm yêu cầu, VD: gần Làng ĐH, có máy giặt…' : 'VD: 2 người, dưới 4 triệu, có bếp, không ở ghép'} />
    <button type="submit" className="natural-rental-search__send" aria-label={loading ? 'Đang tìm' : 'Tìm theo nhu cầu'} title={loading ? 'Đang tìm' : 'Tìm theo nhu cầu'} disabled={loading || !text.trim()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </button>
  </form>
  const trigger = <button ref={opener} type="button" data-glass-exclude className="natural-rental-search__trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls="natural-rental-search-panel" onClick={() => {
    if (!open) {
      // A new search-bar query starts fresh; reopening a refinement keeps its criteria.
      if (query.trim() && query.trim() !== seededQuery.current) {
        cancelSearch(); previous.current = undefined
        setText(query.slice(0, 1000)); setResult(null); setAsked(''); setError('')
      }
      seededQuery.current = query.trim()
      onOpen?.()
    }
    if (open) cancelSearch()
    setOpen(value => !value)
  }}><HomejiAgentMark /><span className="natural-rental-search__trigger-lead">Tìm bằng </span>AI</button>
  return <div className="natural-rental-search">
    {renderTrigger ? renderTrigger(trigger) : trigger}
    {present ? createPortal(<section {...presence} id="natural-rental-search-panel" className={`natural-rental-search__panel${loading ? ' is-thinking' : ''}`} role="dialog" aria-busy={loading} aria-label="Tìm phòng bằng AI" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close() }
    }}>
      <header className="natural-rental-search__head">
        <span className="natural-rental-search__mark" aria-hidden="true"><HomejiAgentMark /></span>
        <h2>Tìm phòng bằng AI</h2>
        {result || asked ? <button type="button" className="natural-rental-search__reset" disabled={loading} onClick={startOver}>Hỏi lại từ đầu</button> : null}
        <button type="button" className="natural-rental-search__close" aria-label="Đóng tìm theo nhu cầu" title="Đóng tìm theo nhu cầu" onClick={close}><X aria-hidden="true" size={18} style={{ verticalAlign: 'middle' }} /></button>
      </header>
      {asked ? <motion.p className="natural-rental-search__bubble" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{asked}</motion.p> : null}
      {!asked ? form : null}
      {!asked && !text.trim() ? <div className="natural-rental-search__examples" aria-label="Ví dụ nhu cầu">
        {EXAMPLES.map(example => <button key={example} type="button" onClick={() => { setText(example); queryInput.current?.focus() }}>{example}</button>)}
      </div> : null}
      {loading ? <p className="natural-rental-search__thinking" role="status"><span /><span /><span /> Homeji đang tìm tin phù hợp…</p> : null}
      {error ? <p className="natural-rental-search__error" role="alert">{error}</p> : null}
      {result ? <AiSearchReview variant="compact" result={result} onOpenListing={() => setOpen(false)} onRefine={value => { setText(value); queryInput.current?.focus() }} onApply={update => { setOpen(false); navigate('/?section=listings', { state: { aiSearchUpdate: update } }) }} /> : null}
      {asked && !loading ? form : null}
      {aiFeatureFlags.sourceBrowser ? <RentalSourceBrowser /> : null}
    </section>, document.body) : null}
  </div>
}

const EXAMPLES = ['Dưới 3 triệu gần ĐH Bách Khoa', '2 người, có bếp, không ở ghép', 'Ở ghép Thủ Đức dưới 2 triệu']
