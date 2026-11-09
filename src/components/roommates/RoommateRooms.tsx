import { MoneyInput } from '../ui/MoneyInput'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchRentalPosts, startRentalPostConversation, type RentalPostSummary } from '../../api'
import { RentalPostType, UserRole } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { amenityLabel, formatPrice } from '../../lib/labels'
import { mapMessagesUrl, mapPostUrl } from '../../lib/mapDeepLinks'
import { RoommateRoomsSkeleton } from '../skeletons/PageSkeletons'
import './RoommateRooms.css'
import { RoommateEmptyArt, RoommateSceneArt, SeatIcon } from './roommateArt'

const TONES = ['#14b8a6', '#ff7a59', '#22c55e', '#8b5cf6'] as const
const MAX_SEATS = 6

const PAGE_SIZE = 20

type Props = { initialKeyword?: string; onOpenConversation?: (id: string) => void }

export function RoommateRooms({ initialKeyword = '', onOpenConversation }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isRenter = profile?.role === UserRole.Renter
  const [draftKeyword, setDraftKeyword] = useState(initialKeyword)
  const [draftBudget, setDraftBudget] = useState(() => profile?.maxBudget?.toString() ?? '')
  const [filters, setFilters] = useState<{ keyword: string; maxPrice?: number }>(() => ({ keyword: initialKeyword, maxPrice: profile?.maxBudget ?? undefined }))
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [retry, setRetry] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const chatLock = useRef(false)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const result = await searchRentalPosts({ ...filters, type: RentalPostType.RoommateShare,
          ownerRole: UserRole.Renter, minAvailableSlots: 1, page, pageSize: PAGE_SIZE }, { signal: controller.signal })
        if (active) setPosts(result)
      } catch (error) {
        if (active) { setPosts([]); setError(getErrorMessage(error, 'Không tải được tin tìm người ghép.')) }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false; controller.abort() }
  }, [filters, page, retry])

  const search = (event: FormEvent) => {
    event.preventDefault()
    const budget = draftBudget.trim() ? Number(draftBudget) : undefined
    if (budget !== undefined && (!Number.isFinite(budget) || budget <= 0)) {
      setActionError('Ngân sách phải là số lớn hơn 0.')
      return
    }
    setActionError('')
    setFilters({ keyword: draftKeyword.trim(), maxPrice: budget })
    setPage(1)
  }

  const contact = async (post: RentalPostSummary) => {
    if (chatLock.current || post.ownerId === profile?.id) return
    chatLock.current = true
    setBusyId(post.id)
    setActionError('')
    try {
      const conversation = await startRentalPostConversation(post.id)
      if (!mounted.current) return
      if (onOpenConversation) onOpenConversation(conversation.id)
      else navigate(mapMessagesUrl(conversation.id))
    } catch (error) {
      if (mounted.current) setActionError(getErrorMessage(error, 'Chưa mở được cuộc trò chuyện. Bạn có thể thử lại.'))
    } finally {
      chatLock.current = false
      if (mounted.current) setBusyId(null)
    }
  }

  const cheapest = posts.length ? Math.min(...posts.map(post => post.price).filter(price => price > 0)) : 0
  const openSeats = posts.reduce((sum, post) => sum + (post.availableSlots ?? 0), 0)

  return <section className="roommate-posts rm" aria-label="Tin tìm người ghép">
    <header className="rm-hero" data-glass-exclude="">
      <div className="rm-hero__copy">
        <span className="rm-hero__eyebrow">Phòng ở ghép</span>
        <h2>Người đang tìm bạn ở cùng</h2>
        <p>Tin do sinh viên và người thuê tự đăng: biết người đăng, chỗ đang ở và số bạn cần ghép thêm trước khi nhắn tin.</p>
        {!loading && !error && posts.length ? <ul className="rm-hero__stats" aria-label="Tóm tắt trang này">
          <li><strong>{posts.length}</strong> tin trên trang</li>
          {openSeats ? <li><strong>{openSeats}</strong> chỗ còn trống</li> : null}
          {Number.isFinite(cheapest) && cheapest > 0 ? <li>Từ <strong>{formatPrice(cheapest)}</strong>/người</li> : null}
        </ul> : null}
        {isRenter ? <div className="rm-hero__actions"><Link className="btn btn-primary" to="/posts/new?type=roommate">Đăng tin tìm người ghép</Link><Link className="btn btn-secondary" to="/my-posts?type=roommate">Tin của tôi</Link></div> : null}
      </div>
      <RoommateSceneArt />
    </header>
    <form className="roommate-workspace__filters rm-filters" data-glass-exclude="" onSubmit={search}>
      <label className="rm-filters__field rm-filters__field--search">Đường, trường hoặc nội dung tin<input className="form-input" value={draftKeyword}
        maxLength={200} onChange={event => setDraftKeyword(event.target.value)} placeholder="VD: Võ Văn Ngân, UEL, không hút thuốc" /></label>
      <label className="rm-filters__field rm-filters__field--budget">Chi phí tối đa/người/tháng<MoneyInput className="form-input"  min="1" step="1"
        value={draftBudget} onValueChange={value => setDraftBudget(value)} placeholder="Không giới hạn" /></label>
      <button type="submit" className="btn btn-primary">Tìm tin</button>
    </form>
    {actionError ? <p role="alert" className="roommate-workspace__error">{actionError}</p> : null}
    {error ? <div role="alert" className="roommate-workspace__error"><p>{error}</p><button className="btn btn-secondary" type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : null}
    {loading ? <RoommateRoomsSkeleton /> : !error && posts.length ?
      <div className="rm-grid">{posts.map((post, index) => {
        const ownPost = post.ownerId === profile?.id
        const author = post.ownerDisplayName?.trim() || 'Người đăng tin'
        const capacity = post.maxOccupants ?? null
        const open = post.availableSlots ?? null
        const seats = capacity != null && open != null && capacity > 0 && capacity <= MAX_SEATS
          ? Array.from({ length: capacity }, (_, seat) => seat < capacity - open) : null
        const chips = (post.amenities ?? []).map(amenityLabel).filter(Boolean).slice(0, 3)
        return <article key={post.id} className="rm-card" data-motion-reveal="" data-glass-exclude="" style={{ '--tone': TONES[index % TONES.length] } as CSSProperties}>
          <div className="rm-card__band">
            <div className="rm-card__author">
              {post.ownerAvatarPath ? <img className="rm-card__avatar" src={post.ownerAvatarPath} alt="" loading="lazy" /> : <span className="rm-card__avatar" aria-hidden="true">{author.slice(0, 1).toUpperCase()}</span>}
              <div><strong>{author}</strong><p>{post.ownerSchool || 'Chưa cung cấp trường học'}</p></div>
            </div>
            {open != null ? <div className="rm-card__seats" aria-label={capacity != null ? `Đã có ${Math.max(0, capacity - open)} người, cần thêm ${open} bạn` : `Cần ${open} bạn`}>
              {seats ? <span className="rm-card__seat-row" aria-hidden="true">{seats.map((taken, seat) => <SeatIcon key={seat} taken={taken} />)}</span> : null}
              <span className="rm-card__need">Cần {open} bạn</span>
            </div> : null}
          </div>
          <div className="rm-card__body">
            <h3><Link to={mapPostUrl(post.id)}>{post.title || 'Tìm người ở cùng'}</Link></h3>
            <p className="rm-card__description">{post.descriptionExcerpt || 'Người đăng chưa có phần giới thiệu. Mở chi tiết để xem thông tin chỗ ở.'}</p>
            <ul className="rm-card__facts">
              <li className="rm-card__fact rm-card__fact--place">{post.address || 'Chưa cung cấp địa chỉ'}</li>
              {capacity != null ? <li className="rm-card__fact rm-card__fact--home">Tối đa {capacity} người · {post.area} m²</li> : null}
              {chips.map(chip => <li key={chip} className="rm-card__fact rm-card__fact--tag">{chip}</li>)}
            </ul>
            <div className="rm-card__cost"><span>Chi phí dự kiến/người/tháng</span><strong>{formatPrice(post.price)}</strong></div>
          </div>
          <footer className="rm-card__actions">
            <Link className="btn btn-secondary btn-sm" to={mapPostUrl(post.id)}>Xem chỗ ở & giới thiệu</Link>
            {ownPost ? <Link className="btn btn-primary btn-sm" to={`/posts/${post.id}/edit`}>Chỉnh sửa tin của tôi</Link>
              : profile ? <button type="button" className="btn btn-primary btn-sm" disabled={busyId !== null} onClick={() => void contact(post)}>{busyId === post.id ? 'Đang mở…' : 'Nhắn tin người đăng'}</button>
                : <Link className="btn btn-primary btn-sm" to="/login">Đăng nhập để nhắn tin</Link>}
          </footer>
        </article>
      })}</div>
      : !error ? <div className="rm-empty"><RoommateEmptyArt /><div><h3>Chưa có tin phù hợp</h3><p>Thử đổi từ khóa hoặc ngân sách. Tin tìm người ghép sẽ xuất hiện sau khi được duyệt.</p></div></div> : null}
    <nav className="roommate-workspace__pagination" aria-label="Trang tin tìm người ghép">
      <button type="button" className="btn btn-secondary" disabled={loading || !!error || page === 1} onClick={() => setPage(p => p - 1)}>Trang trước</button>
      <span aria-live="polite">Trang {page}</span>
      <button type="button" className="btn btn-secondary" disabled={loading || !!error || posts.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Trang sau</button>
    </nav>
  </section>
}
