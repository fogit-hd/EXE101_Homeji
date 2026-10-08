import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getSavedPosts, savePost, searchRentalPosts, unsavePost, type RentalPostSummary } from '../../api'
import { RentalPostType, UserRole } from '../../api/types'
import { useAuth } from '../../contexts/AuthContext'
import { getErrorMessage } from '../../lib/errors'
import { RentalPostCard } from '../RentalPostCard'
import { ContentSkeleton } from '../ContentSkeleton'

const PAGE_SIZE = 20

export function RoommateRooms({ initialKeyword = '' }: { initialKeyword?: string }) {
  const { profile } = useAuth()
  const isRenter = profile?.role === UserRole.Renter
  const [draftKeyword, setDraftKeyword] = useState(initialKeyword)
  const [draftBudget, setDraftBudget] = useState(() => profile?.maxBudget?.toString() ?? '')
  const [filters, setFilters] = useState<{ keyword: string; maxPrice?: number }>(() => ({ keyword: initialKeyword, maxPrice: profile?.maxBudget ?? undefined }))
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<RentalPostSummary[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const saveLock = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const result = await searchRentalPosts({ ...filters, type: RentalPostType.RoommateShare,
          minAvailableSlots: 1, page, pageSize: PAGE_SIZE }, { signal: controller.signal })
        if (active) setPosts(result)
      } catch (error) {
        if (active) { setPosts([]); setError(getErrorMessage(error, 'Không tải được phòng ở ghép.')) }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false; controller.abort() }
  }, [filters, page])

  useEffect(() => {
    if (!isRenter) return
    let active = true
    void getSavedPosts().then(posts => { if (active) setSavedIds(new Set(posts.map(post => post.id))) })
      .catch(error => { if (active) setError(getErrorMessage(error, 'Không tải được trạng thái tin đã lưu.')) })
    return () => { active = false }
  }, [isRenter, profile?.id])

  const search = (event: FormEvent) => {
    event.preventDefault()
    const budget = draftBudget.trim() ? Number(draftBudget) : undefined
    if (budget !== undefined && (!Number.isFinite(budget) || budget <= 0)) {
      setError('Ngân sách phải là số lớn hơn 0.')
      return
    }
    setFilters({ keyword: draftKeyword.trim(), maxPrice: budget })
    setPage(1)
  }

  const toggleSave = async (postId: string) => {
    if (saveLock.current) return
    saveLock.current = true
    setBusyId(postId)
    setError('')
    const wasSaved = savedIds.has(postId)
    try {
      await (wasSaved ? unsavePost(postId) : savePost(postId))
      setSavedIds(ids => { const next = new Set(ids); if (wasSaved) next.delete(postId); else next.add(postId); return next })
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được tin đã lưu.'))
    } finally {
      saveLock.current = false
      setBusyId(null)
    }
  }

  return <section aria-label="Tìm phòng ở ghép">
    <p>Phòng đang tìm thêm người và còn chỗ trống. Lưu phòng quan tâm để tìm người cùng ở.</p>
    <form className="roommate-workspace__filters" onSubmit={search}>
      <label>Đường, trường hoặc tên phòng<input className="form-input" value={draftKeyword}
        maxLength={200} onChange={event => setDraftKeyword(event.target.value)} placeholder="VD: Linh Trung, UEL" /></label>
      <label>Ngân sách tối đa / tháng<input className="form-input" type="number" min="0.01" step="any"
        value={draftBudget} onChange={event => setDraftBudget(event.target.value)} placeholder="Không giới hạn" /></label>
      <button type="submit" className="btn btn-primary">Tìm phòng</button>
    </form>
    {error ? <p role="alert" className="roommate-workspace__error">{error}</p> : null}
    {loading ? <ContentSkeleton variant="list" label="Đang tìm phòng ở ghép…" /> : posts.length ?
      <div className="roommate-workspace__rooms">{posts.map(post => <RentalPostCard key={post.id} post={post}
        showSave={isRenter} isSaved={savedIds.has(post.id)} saveBusy={busyId !== null}
        onSave={() => void toggleSave(post.id)} onUnsave={() => void toggleSave(post.id)} />)}</div>
      : <p>Không có phòng ở ghép phù hợp trên trang này. Thử đổi từ khóa hoặc ngân sách.</p>}
    <nav className="roommate-workspace__pagination" aria-label="Trang phòng ở ghép">
      <button type="button" className="btn btn-secondary" disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>Trang trước</button>
      <span aria-live="polite">Trang {page}</span>
      <button type="button" className="btn btn-secondary" disabled={loading || posts.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Trang sau</button>
    </nav>
  </section>
}
