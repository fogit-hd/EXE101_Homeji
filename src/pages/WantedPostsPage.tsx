import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  closeWantedPost,
  createWantedPost,
  searchWantedPosts,
  startWantedPostConversation,
  type RentalWantedPost,
} from '../api'
import { UserRole, WantedPostStatus } from '../api/types'
import {
  PageFrame,
  exploreMapUrl,
  usePageFrameChromeActive,
  usePageFrameChromePortals,
} from '../components/chrome'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { PageNotice } from '../components/toast/PageNotice'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import { mapMessagesUrl } from '../lib/mapDeepLinks'
import {
  AMENITY_OPTIONS,
  amenityLabel,
  formatPrice,
  wantedPostStatusLabel,
} from '../lib/labels'

export function WantedPostsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const myId = profile?.id ?? null
  const isRenter = profile?.role === UserRole.Renter

  const [tab, setTab] = useState<'browse' | 'create'>('browse')
  const [posts, setPosts] = useState<RentalWantedPost[]>([])
  const [area, setArea] = useState('')
  const [maxBudgetFilter, setMaxBudgetFilter] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [chatBusyId, setChatBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [preferredArea, setPreferredArea] = useState('Thủ Đức')
  const [maxBudget, setMaxBudget] = useState('4000000')
  const [occupantCount, setOccupantCount] = useState('1')
  const [amenityCodes, setAmenityCodes] = useState<string[]>([])
  const [desiredMoveInDate, setDesiredMoveInDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })

  const loadFn = useCallback(async () => {
    setPosts(
      await searchWantedPosts({
        area: area.trim() || undefined,
        maxBudget: maxBudgetFilter ? Number(maxBudgetFilter) : undefined,
        pageSize: 30,
      }),
    )
  }, [area, maxBudgetFilter])

  const { showLoader, onIntroComplete, error, disrupted, reload } = usePersistentLoad(loadFn, [
    area,
    maxBudgetFilter,
  ])

  const toggleAmenity = (code: string) => {
    setAmenityCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating) return
    setActionError('')
    setActionMsg('')
    if (!isRenter) {
      setActionError('Chỉ tài khoản người thuê mới đăng tin tìm phòng.')
      return
    }
    if (!title.trim() || !description.trim() || !preferredArea.trim()) {
      setActionError('Nhập đủ tiêu đề, mô tả và khu vực mong muốn.')
      return
    }
    const budget = Number(maxBudget)
    const occupants = Number(occupantCount)
    if (!Number.isFinite(budget) || budget <= 0 || !Number.isInteger(occupants) || occupants <= 0) {
      setActionError('Ngân sách phải lớn hơn 0 và số người phải là số nguyên dương.')
      return
    }
    setCreating(true)
    try {
      await createWantedPost({
        title: title.trim(),
        description: description.trim(),
        preferredArea: preferredArea.trim(),
        maxBudget: budget,
        occupantCount: occupants,
        amenityCodes,
        desiredMoveInDate,
      })
      setActionMsg('Đã đăng tin tìm phòng.')
      setTitle('')
      setDescription('')
      setAmenityCodes([])
      setTab('browse')
      void reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Đăng tin thất bại'))
    } finally {
      setCreating(false)
    }
  }

  const handleClose = async (id: string) => {
    setActionError('')
    setActionMsg('')
    try {
      await closeWantedPost(id)
      setActionMsg('Đã đóng tin.')
      void reload()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không đóng được tin'))
    }
  }

  const handleChat = async (postId: string) => {
    setChatBusyId(postId)
    setActionError('')
    try {
      const convo = await startWantedPostConversation(postId)
      navigate(mapMessagesUrl(convo.id))
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không mở được chat'))
    } finally {
      setChatBusyId(null)
    }
  }

  const actions = (
    <>
      <Link to={exploreMapUrl()} className="btn btn-secondary btn-sm btn-map-cta">
        Xem trên bản đồ
      </Link>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => setTab('create')}
        disabled={!isRenter}
        title={!isRenter ? 'Chỉ người thuê mới đăng nhu cầu' : undefined}
      >
        Đăng nhu cầu
      </button>
    </>
  )

  const filters =
    tab === 'browse' ? (
      <>
        <input
          className="form-input"
          placeholder="Khu vực…"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          aria-label="Lọc khu vực"
        />
        <input
          className="form-input"
          type="number"
          placeholder="Ngân sách tối đa…"
          value={maxBudgetFilter}
          onChange={(e) => setMaxBudgetFilter(e.target.value)}
          aria-label="Lọc ngân sách"
        />
      </>
    ) : null

  const frameActions = tab === 'browse' ? actions : undefined
  const liftChrome = usePageFrameChromeActive()
  const chromePortals = usePageFrameChromePortals({
    actions: frameActions,
    filters,
  })

  const body = (
    <>
      {chromePortals}
      <div className="tabs" role="tablist" aria-label="Tin tìm phòng">
        <button
          type="button"
          className={`tab ${tab === 'browse' ? 'active' : ''}`}
          onClick={() => setTab('browse')}
        >
          Đang tìm
        </button>
        <button
          type="button"
          className={`tab ${tab === 'create' ? 'active' : ''}`}
          onClick={() => setTab('create')}
          disabled={!isRenter}
          title={!isRenter ? 'Chỉ người thuê mới đăng nhu cầu' : undefined}
        >
          Đăng nhu cầu
        </button>
      </div>

      {embedded && !liftChrome && tab === 'browse' ? (
        <div className="page-frame__actions">{actions}</div>
      ) : null}
      {embedded && !liftChrome && filters ? (
        <div className="page-frame__filters">{filters}</div>
      ) : null}

      <PageNotice message={actionError || (error && !disrupted ? error : '')} tone="error" />
      <PageNotice message={actionMsg} tone="success" />

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant={tab === 'create' ? 'form' : 'list'} label="Đang tải nhu cầu tìm phòng…" />
      ) : tab === 'create' ? (
        !isRenter ? (
          <div className="page-frame-empty">
            <p className="page-frame-empty__title">Chỉ người thuê được đăng</p>
            <p>Đăng nhập bằng tài khoản người thuê để đăng nhu cầu tìm phòng.</p>
          </div>
        ) : (
          <form className="card wanted-post-form" aria-busy={creating} onSubmit={(e) => void handleCreate(e)}>
            <div className="form-group">
              <label className="form-label" htmlFor="wanted-title">Tiêu đề</label>
              <input
                id="wanted-title"
                className="form-input"
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wanted-description">Mô tả</label>
              <textarea
                id="wanted-description"
                className="form-textarea"
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wanted-area">Khu vực mong muốn</label>
              <input
                id="wanted-area"
                className="form-input"
                maxLength={300}
                value={preferredArea}
                onChange={(e) => setPreferredArea(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wanted-budget">Ngân sách tối đa (đ/tháng)</label>
              <input
                id="wanted-budget"
                className="form-input"
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                required
                min={1}
                step={1}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wanted-occupants">Số người</label>
              <input
                id="wanted-occupants"
                className="form-input"
                type="number"
                value={occupantCount}
                onChange={(e) => setOccupantCount(e.target.value)}
                required
                min={1}
                step={1}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="wanted-move-in">Ngày muốn chuyển vào</label>
              <input
                id="wanted-move-in"
                className="form-input"
                type="date"
                value={desiredMoveInDate}
                onChange={(e) => setDesiredMoveInDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <span className="form-label">Tiện ích mong muốn</span>
              <div className="amenity-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AMENITY_OPTIONS.map((code) => {
                  const on = amenityCodes.includes(code)
                  return (
                    <button
                      key={code}
                      type="button"
                      className={`btn btn-sm ${on ? 'btn-primary' : 'btn-secondary'}`}
                      aria-pressed={on}
                      onClick={() => toggleAmenity(code)}
                    >
                      {amenityLabel(code)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="wanted-post-form__actions">
              <button type="button" className="btn btn-secondary" disabled={creating} onClick={() => setTab('browse')}>Quay lại danh sách</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Đang đăng…' : 'Đăng tin'}
              </button>
            </div>
          </form>
        )
      ) : posts.length === 0 ? (
        <div className="page-frame-empty">
          <p className="page-frame-empty__title">Chưa có tin tìm phòng</p>
          <p>Thử đổi bộ lọc hoặc đăng nhu cầu mới nếu bạn là người thuê.</p>
        </div>
      ) : (
        <div className="notification-list">
          {posts.map((p) => {
            const mine = Boolean(myId && p.requesterId === myId)
            return (
              <article key={p.id} className="card notification-item map-motion-fade-up">
                <div>
                  <span className="badge badge-gray">
                    {wantedPostStatusLabel[p.status] ?? 'Tin'}
                    {mine ? ' · Của bạn' : ''}
                  </span>
                  <h3>{p.title}</h3>
                  {p.description ? <p>{p.description}</p> : null}
                  <p>
                    {p.preferredArea} · tối đa {formatPrice(p.maxBudget)} · {p.occupantCount} người
                  </p>
                  {p.amenityCodes?.length ? (
                    <p style={{ fontSize: '0.85rem', opacity: 0.85 }}>
                      {p.amenityCodes.map((c) => amenityLabel(c)).join(' · ')}
                    </p>
                  ) : null}
                  <small>
                    {p.requesterDisplayName} · vào khoảng {p.desiredMoveInDate}
                  </small>
                </div>
                <div className="notification-item__actions">
                  {!mine && p.status === WantedPostStatus.Active ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={chatBusyId === p.id}
                      onClick={() => void handleChat(p.id)}
                    >
                      {chatBusyId === p.id ? 'Đang mở…' : 'Nhắn tin'}
                    </button>
                  ) : null}
                  {mine && p.status === WantedPostStatus.Active ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void handleClose(p.id)}
                    >
                      Đóng tin
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className="feature-page">{body}</div>
  }

  return (
    <PageFrame title="Tin tìm phòng" actions={actions} filters={filters}>
      {body}
    </PageFrame>
  )
}
