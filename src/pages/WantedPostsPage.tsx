import { useCallback, useState } from 'react'
import {
  closeWantedPost,
  createWantedPost,
  searchWantedPosts,
  startWantedPostConversation,
  type RentalWantedPost,
} from '../api'
import { UserRole, WantedPostStatus } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import {
  AMENITY_OPTIONS,
  amenityLabel,
  formatPrice,
  wantedPostStatusLabel,
} from '../lib/labels'

export function WantedPostsPage({ embedded = false }: { embedded?: boolean }) {
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
    try {
      await createWantedPost({
        title: title.trim(),
        description: description.trim(),
        preferredArea: preferredArea.trim(),
        maxBudget: Number(maxBudget) || 0,
        occupantCount: Number(occupantCount) || 1,
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
      await startWantedPostConversation(postId)
      setActionMsg('Đã mở hội thoại — kiểm tra mục Tin nhắn.')
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không mở được chat'))
    } finally {
      setChatBusyId(null)
    }
  }

  return (
    <div className={embedded ? 'map-embed' : 'container page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Tin tìm phòng</h1>
          <p className="page-subtitle">Người thuê đăng nhu cầu — chủ nhà có thể liên hệ</p>
        </>
      ) : null}

      <div className="tabs">
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

      {(actionError || (error && !disrupted)) && (
        <div className="alert alert-error">{actionError || error}</div>
      )}
      {actionMsg ? <div className="alert alert-success">{actionMsg}</div> : null}

      {tab === 'browse' ? (
        <div className="page-header-row" style={{ marginBottom: 12 }}>
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
        </div>
      ) : null}

      {showLoader ? (
        disrupted
          ? <HomejiLoader onIntroComplete={onIntroComplete} message={error} />
          : <ContentSkeleton variant={tab === 'create' ? 'form' : 'list'} label="Đang tải nhu cầu tìm phòng…" />
      ) : tab === 'create' ? (
        !isRenter ? (
          <div className="empty-state card">Đăng nhập bằng tài khoản người thuê để đăng nhu cầu.</div>
        ) : (
          <form className="card" onSubmit={(e) => void handleCreate(e)}>
            <div className="form-group">
              <label className="form-label">Tiêu đề</label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Khu vực mong muốn</label>
              <input
                className="form-input"
                value={preferredArea}
                onChange={(e) => setPreferredArea(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ngân sách tối đa</label>
              <input
                className="form-input"
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                required
                min={0}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Số người</label>
              <input
                className="form-input"
                type="number"
                value={occupantCount}
                onChange={(e) => setOccupantCount(e.target.value)}
                required
                min={1}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ngày muốn chuyển vào</label>
              <input
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
            <button type="submit" className="btn btn-primary">
              Đăng tin
            </button>
          </form>
        )
      ) : posts.length === 0 ? (
        <div className="empty-state card">Chưa có tin tìm phòng.</div>
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
    </div>
  )
}
