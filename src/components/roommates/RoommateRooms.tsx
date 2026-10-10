import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchRentalPosts, startRentalPostConversation, type RentalPostSummary } from '../../api'
import { RentalPostType, UserRole } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice } from '../../lib/labels'
import { mapMessagesUrl, mapPostUrl } from '../../lib/mapDeepLinks'
import { ContentSkeleton } from '../ContentSkeleton'
import './RoommateRooms.css'

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

  return <section className="roommate-posts" aria-label="Tin tìm người ghép">
    <header className="roommate-posts__intro">
      <div><h2>Người đang tìm bạn ở cùng</h2><p>Tin do sinh viên và người thuê tự đăng: biết người đăng, chỗ đang ở và số bạn cần ghép thêm trước khi nhắn tin.</p></div>
      {isRenter ? <div className="roommate-posts__actions"><Link className="btn btn-primary" to="/posts/new?type=roommate">Đăng tin tìm người ghép</Link><Link className="btn btn-secondary" to="/my-posts?type=roommate">Tin của tôi</Link></div> : null}
    </header>
    <form className="roommate-workspace__filters" onSubmit={search}>
      <label>Đường, trường hoặc nội dung tin<input className="form-input" value={draftKeyword}
        maxLength={200} onChange={event => setDraftKeyword(event.target.value)} placeholder="VD: Võ Văn Ngân, UEL, không hút thuốc" /></label>
      <label>Chi phí tối đa/người/tháng<input className="form-input" type="number" min="1" step="1"
        value={draftBudget} onChange={event => setDraftBudget(event.target.value)} placeholder="Không giới hạn" /></label>
      <button type="submit" className="btn btn-primary">Tìm tin</button>
    </form>
    {actionError ? <p role="alert" className="roommate-workspace__error">{actionError}</p> : null}
    {error ? <div role="alert" className="roommate-workspace__error"><p>{error}</p><button className="btn btn-secondary" type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : null}
    {loading ? <ContentSkeleton variant="list" label="Đang tìm tin ghép…" /> : !error && posts.length ?
      <div className="roommate-posts__grid">{posts.map(post => {
        const ownPost = post.ownerId === profile?.id
        const author = post.ownerDisplayName?.trim() || 'Người đăng tin'
        return <article key={post.id} className="roommate-posts__card">
          <header className="roommate-posts__author">
            {post.ownerAvatarPath ? <img className="roommate-posts__avatar" src={post.ownerAvatarPath} alt="" loading="lazy" /> : <span className="roommate-posts__avatar" aria-hidden="true">{author.slice(0, 1).toUpperCase()}</span>}
            <div><strong>{author}</strong><p>{post.ownerSchool || 'Chưa cung cấp trường học'}</p></div>
            {post.availableSlots != null ? <span className="roommate-posts__slots">Cần {post.availableSlots} bạn</span> : null}
          </header>
          <h3><Link to={mapPostUrl(post.id)}>{post.title || 'Tìm người ở cùng'}</Link></h3>
          <p className="roommate-posts__description">{post.descriptionExcerpt || 'Người đăng chưa có phần giới thiệu. Mở chi tiết để xem thông tin chỗ ở.'}</p>
          <p className="roommate-posts__address">{post.address || 'Chưa cung cấp địa chỉ'}</p>
          <div className="roommate-posts__cost"><span>Chi phí dự kiến/người/tháng</span><strong>{formatPrice(post.price)}</strong></div>
          {post.maxOccupants != null ? <p className="roommate-posts__capacity">Chỗ ở tối đa {post.maxOccupants} người · {post.area} m²</p> : null}
          <footer className="roommate-posts__actions">
            <Link className="btn btn-secondary btn-sm" to={mapPostUrl(post.id)}>Xem chỗ ở & giới thiệu</Link>
            {ownPost ? <Link className="btn btn-primary btn-sm" to={`/posts/${post.id}/edit`}>Chỉnh sửa tin của tôi</Link>
              : profile ? <button type="button" className="btn btn-primary btn-sm" disabled={busyId !== null} onClick={() => void contact(post)}>{busyId === post.id ? 'Đang mở…' : 'Nhắn tin người đăng'}</button>
                : <Link className="btn btn-primary btn-sm" to="/login">Đăng nhập để nhắn tin</Link>}
          </footer>
        </article>
      })}</div>
      : !error ? <div className="roommate-posts__empty"><h3>Chưa có tin phù hợp</h3><p>Thử đổi từ khóa hoặc ngân sách. Tin tìm người ghép sẽ xuất hiện sau khi được duyệt.</p></div> : null}
    <nav className="roommate-workspace__pagination" aria-label="Trang tin tìm người ghép">
      <button type="button" className="btn btn-secondary" disabled={loading || !!error || page === 1} onClick={() => setPage(p => p - 1)}>Trang trước</button>
      <span aria-live="polite">Trang {page}</span>
      <button type="button" className="btn btn-secondary" disabled={loading || !!error || posts.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Trang sau</button>
    </nav>
  </section>
}
