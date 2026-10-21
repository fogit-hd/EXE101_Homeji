import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { AddressAutocomplete } from '../map/AddressAutocomplete'
import { AMENITY_OPTIONS, amenityLabel, formatPrice } from '../../lib/labels'
import { interestFromSearch, interestSession } from '../../lib/searchInterestCapture'
import { clearInterestHistory, dismissSearchInterest, followSearchInterest, getSearchInterests, inferSearchInterest,
  markInterestViewed, rankInterestRooms, observeSearchInterest, removeSearchInterest, setInterestSettings,
  type InterestCriteria, type InterestOverview, type InterestSettings } from '../../api/searchInterests'
import './SearchInterestCenter.css'

export function SearchInterestCenter() {
  const { isAuthenticated, profile } = useAuth()
  return isAuthenticated && profile ? <OwnedSearchInterestCenter key={profile.id} /> : null
}

function OwnedSearchInterestCenter() {
  const { isAuthenticated, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const owner = profile?.id
  const [state, setState] = useState<{ owner: string; value: InterestOverview } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<InterestCriteria | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).get('interest') === 'manage')
  const [confirmClear, setConfirmClear] = useState(false)
  const latest = useRef(0)
  const current = state && state.owner === owner ? state.value : null
  const apply = useCallback((value: InterestOverview) => { if (owner) setState({ owner, value }) }, [owner])
  useEffect(() => {
    if (!isAuthenticated || !owner) return
    let cancelled = false
    void getSearchInterests().then(value => { if (!cancelled) setState({ owner, value }) }).catch(err => { if (!cancelled) setError(getErrorMessage(err, 'Chưa tải được cá nhân hóa.')) })
    return () => { cancelled = true; latest.current = -1 }
  }, [isAuthenticated, owner])
  useEffect(() => {
    if (!isAuthenticated || !owner || !current?.settings.enabled) return
    let cancelled = false
    const capture = window.setTimeout(() => {
      const params = new URLSearchParams(location.search)
      const post = params.get('post')
      if (post && /^[0-9a-f-]{36}$/i.test(post)) { void markInterestViewed(post).catch(() => {}); return }
      const criteria = interestFromSearch(location.search)
      if (!criteria) return
      try {
        const session = interestSession(sessionStorage, owner, Date.now(), () => crypto.randomUUID())
        const generation = latest.current
        void observeSearchInterest(session, criteria).then(value => { if (!cancelled && generation === latest.current) apply(value) }).catch(() => {})
      } catch { /* Disabled storage must never block normal search. */ }
    }, 700)
    return () => { cancelled = true; window.clearTimeout(capture) }
  }, [isAuthenticated, owner, current?.settings.enabled, location.search, apply])
  const rankedRooms = useRef('')
  useEffect(() => {
    if (!owner || !current?.settings.enabled || busy) return
    let cancelled = false
    const generation = latest.current
    const refresh = async () => {
      if (document.hidden) return
      try { const value = await getSearchInterests(); if (!cancelled && latest.current === generation) apply(value) } catch { /* Keep the last successful snapshot. */ }
    }
    const timer = window.setInterval(() => void refresh(), 60000)
    window.addEventListener('focus', refresh)
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [owner, current?.settings.enabled, busy, apply])
  const roomSignature = current?.rooms.map(room => room.post.id).sort().join(',') ?? ''
  useEffect(() => {
    if (!owner || !current?.settings.enabled || !current.settings.aiEnabled || !roomSignature || busy) return
    const signature = owner + ':' + roomSignature
    if (rankedRooms.current === signature) return
    rankedRooms.current = signature
    let cancelled = false
    const generation = latest.current
    void rankInterestRooms().then(value => { if (!cancelled && latest.current === generation) apply(value) }).catch(() => {})
    return () => { cancelled = true }
  }, [owner, current?.settings.enabled, current?.settings.aiEnabled, roomSignature, busy, apply])
  const closePanel = () => {
    setOpen(false)
    const params = new URLSearchParams(location.search)
    if (params.has('interest')) { params.delete('interest'); navigate({ search: params.toString() }, { replace: true }) }
  }
  useEffect(() => {
    const node = dialog.current
    const requested = open || new URLSearchParams(location.search).get('interest') === 'manage'
    if (requested && node && !node.open) node.showModal()
    if (!requested && node?.open) node.close()
  }, [open, location.search])
  const action = async (run: () => Promise<InterestOverview>) => {
    if (busy) return
    const turn = ++latest.current
    setBusy(true); setError(''); setNotice('')
    try { const value = await run(); if (turn === latest.current) { apply(value); return true } return false }
    catch (err) { if (turn === latest.current) setError(getErrorMessage(err, 'Chưa lưu được thay đổi.')); return false }
    finally { if (turn === latest.current) setBusy(false) }
  }
  const settings = (change: Partial<InterestSettings>) => {
    if (!current) return
    if (change.enabled === false) { setDraft(null); setWarnings([]); setConfirmClear(false) }
    void action(() => setInterestSettings({ ...current.settings, ...change }))
  }
  const infer = async () => {
    if (busy) return
    const turn = ++latest.current
    setBusy(true); setError('')
    try {
      const result = await inferSearchInterest()
      if (turn !== latest.current) return
      setDraft(result.criteria); setWarnings(result.unconfirmed); setNotice(result.notice || '')
    } catch (err) { if (turn === latest.current) setError(getErrorMessage(err, 'AI chưa tổng hợp được, bạn vẫn dùng bộ lọc thường.')) }
    finally { if (turn === latest.current) setBusy(false) }
  }
  const follow = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft) return
    if (await action(() => followSearchInterest(draft))) { setDraft(null); setNotice('Đã theo dõi. Homeji sẽ kiểm tra tin mới phù hợp theo bộ lọc bạn xác nhận.') }
  }
  if (!isAuthenticated || !owner) return null
  const section = new URLSearchParams(location.search).get('section')
  const showLauncher = location.pathname === '/' && (!section || section === 'listings' || section === 'saved') && profile?.role !== UserRole.Admin
  const changeNumber = (key: keyof InterestCriteria, raw: string) => setDraft(value => value ? { ...value, [key]: raw === '' ? null : Number(raw) } : value)
  return <>
    {showLauncher && <button type="button" className="interest-launch" onClick={() => setOpen(true)} aria-haspopup="dialog">
      Phòng mới {current && current.rooms.length > 0 ? <span>{current.rooms.length}</span> : current && current.suggestions.length > 0 ? <span>Gợi ý</span> : null}
    </button>}
    <dialog ref={dialog} className="interest-dialog" aria-labelledby={titleId} onCancel={closePanel} onClose={closePanel}>
      <header><div><p>THEO NHU CẦU CỦA BẠN</p><h2 id={titleId}>Phòng mới phù hợp với bạn</h2></div><button type="button" aria-label="Đóng gợi ý phòng mới" onClick={closePanel}>×</button></header>
      <div className="interest-content" aria-busy={busy}>
        {error && <p role="alert" className="interest-error">{error}</p>}
        {!current ? <button type="button" disabled={busy} onClick={() => void action(getSearchInterests)}>Tải lại thiết lập</button> : <>
          <section><h3>Cá nhân hóa có kiểm soát</h3>
            <p>Chỉ lưu những khu vực và bộ lọc bạn chủ động tìm trên tài khoản này. Không lấy GPS. Lịch sử xét trong 7 ngày; từ 3 phiên tìm cùng khu vực sẽ gợi ý theo dõi.</p>
            <label><input type="checkbox" checked={current.settings.enabled} disabled={busy} onChange={e => settings({ enabled: e.target.checked })} />Bật gợi ý từ lịch sử tìm kiếm</label>
            {!current.settings.enabled && <p>Bật để bắt đầu ghi nhận từ những lần tìm tiếp theo. Tắt sẽ xóa dữ liệu cá nhân hóa và bỏ toàn bộ khu vực đang theo dõi.</p>}
            {current.settings.enabled && <>
              <label><input type="checkbox" checked={current.settings.aiEnabled} disabled={busy} onChange={e => settings({ aiEnabled: e.target.checked })} />Cho phép Gemini tổng hợp nhu cầu</label>
              <small>Khi bạn bấm “AI tổng hợp”, tối đa 5 tìm kiếm gần đây và bộ lọc được gửi tới Gemini. Khi bấm “AI xếp hạng”, tiêu chí đã xác nhận cùng các tin đang xét được gửi để sắp xếp. Không gửi email, tên tài khoản hay vị trí thiết bị.</small>
              <label><input type="checkbox" checked={current.settings.emailEnabled} disabled={busy} onChange={e => settings({ emailEnabled: e.target.checked })} />Nhận email tổng hợp phòng mới, tối đa một lần/ngày</label>
              <small>Thông báo trong web được tạo cho khu vực bạn xác nhận theo dõi. Bạn có thể tắt email bất cứ lúc nào.</small>
            </>}
          </section>
          {current.settings.enabled && <>
            <section><h3>Bạn đang quan tâm khu vực nào?</h3>
              {current.suggestions.length === 0 && <p>Chưa đủ lượt tìm từ nhiều phiên. Bạn vẫn có thể chủ động theo dõi một khu vực.</p>}
              {current.suggestions.map(s => <article key={s.key}><strong>Bạn đang quan tâm khu vực {s.criteria.area}?</strong><p>{s.sessions} phiên tìm trong 7 ngày gần nhất.</p><button type="button" disabled={busy} onClick={() => { setDraft(s.criteria); setWarnings([]) }}>Xem bộ lọc để theo dõi</button><button type="button" disabled={busy} onClick={() => void action(() => dismissSearchInterest(s.criteria.area))}>Bỏ gợi ý 30 ngày</button></article>)}
              <div className="interest-actions"><button type="button" disabled={busy} onClick={() => { setDraft(interestFromSearch(location.search) || { area: '', amenities: [], excludedAmenities: [] }); setWarnings([]) }}>Theo dõi khu vực mới</button><button type="button" disabled={busy || !current.settings.aiEnabled} onClick={() => void infer()}>{busy ? 'Đang xử lý…' : 'AI tổng hợp nhu cầu'}</button></div>
            </section>
            {(notice || current.notice) && <p role="status">{notice || current.notice}</p>}
            {draft && <section><h3>Xác nhận tiêu chí theo dõi</h3><p>Ngân sách bên dưới là tiền thuê, chưa gồm điện, nước và phí. Gemini không tự bật theo dõi.</p>
              {warnings.map((w, i) => <p className="interest-warning" key={i}>{w}</p>)}
              <form onSubmit={event => void follow(event)}>
                <label htmlFor={titleId + '-area'}>Khu vực hoặc địa điểm</label><AddressAutocomplete id={titleId + '-area'} required disabled={busy} value={draft.area}
                  placeholder="Ví dụ: Đại học FPT, Long Thạnh Mỹ"
                  onChange={area => setDraft(value => value ? { ...value, area, latitude: null, longitude: null, radiusKm: null } : value)}
                  onPlaceSelect={place => setDraft(value => value ? { ...value, area: place.address, latitude: place.lat, longitude: place.lng, radiusKm: value.radiusKm ?? 3 } : value)} />
                <div className="interest-grid"><label>Tiền thuê tối thiểu (đ)<input type="number" min={0} value={draft.minPrice ?? ''} onChange={e => changeNumber('minPrice', e.target.value)} /></label><label>Tiền thuê tối đa (đ)<input type="number" min={draft.minPrice ?? 0} value={draft.maxPrice ?? ''} onChange={e => changeNumber('maxPrice', e.target.value)} /></label>
                <label>Diện tích tối thiểu (m²)<input type="number" min={0} value={draft.minArea ?? ''} onChange={e => changeNumber('minArea', e.target.value)} /></label><label>Diện tích tối đa (m²)<input type="number" min={draft.minArea ?? 0} value={draft.maxArea ?? ''} onChange={e => changeNumber('maxArea', e.target.value)} /></label>
                <label>Số người tối thiểu<input type="number" min={1} max={20} value={draft.occupants ?? ''} onChange={e => changeNumber('occupants', e.target.value)} /></label><label>Tiền cọc tối đa (đ)<input type="number" min={0} value={draft.maxDeposit ?? ''} onChange={e => changeNumber('maxDeposit', e.target.value)} /></label></div>
                <fieldset><legend>Tiện ích bắt buộc</legend><div className="interest-amenities">{[...new Set([...AMENITY_OPTIONS, ...(draft.amenities || [])])].map(code => <label key={code}><input type="checkbox" checked={draft.amenities?.includes(code) ?? false} onChange={e => setDraft({ ...draft, amenities: e.target.checked ? [...(draft.amenities || []), code] : draft.amenities?.filter(a => a !== code) })} />{amenityLabel(code)}</label>)}</div></fieldset>
                <fieldset><legend>Tiện ích cần loại trừ</legend><div className="interest-amenities">{[...new Set([...AMENITY_OPTIONS, ...(draft.excludedAmenities || [])])].map(code => <label key={code}><input type="checkbox" checked={draft.excludedAmenities?.includes(code) ?? false} onChange={e => setDraft({ ...draft, excludedAmenities: e.target.checked ? [...(draft.excludedAmenities || []), code] : draft.excludedAmenities?.filter(a => a !== code) })} />{amenityLabel(code)}</label>)}</div></fieldset>
                <label><input type="checkbox" checked={draft.excludeRoommateShare ?? false} onChange={e => setDraft({ ...draft, excludeRoommateShare: e.target.checked })} />Không tìm phòng ở ghép</label>
                <label>Bán kính quanh địa điểm (km)<input type="number" step="0.5" min={0.5} max={30} disabled={draft.latitude == null || draft.longitude == null} value={draft.radiusKm ?? ''} onChange={e => changeNumber('radiusKm', e.target.value)} /></label>
                <small>{draft.latitude == null ? 'Chọn một địa điểm trong danh sách gợi ý để giới hạn bán kính. Nếu nhập tên khu vực thủ công, Homeji đối chiếu tên trong tin đăng.' : 'Tâm là địa điểm bạn đã chọn. Không lấy GPS thiết bị. Bán kính không tương đương thời gian đi đường.'}</small>
                <div className="interest-actions"><button disabled={busy} type="submit">Xác nhận theo dõi khu vực này</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>Hủy</button></div>
              </form>
            </section>}
            <section><h3>Đang theo dõi ({current.following.length}/10)</h3>{current.following.length === 0 && <p>Bạn chưa xác nhận khu vực nào.</p>}{current.following.map(f => <article key={f.id}><strong>{f.criteria.area}</strong><p>{f.criteria.maxPrice ? `Tiền thuê tối đa ${formatPrice(f.criteria.maxPrice)}` : 'Chưa giới hạn tiền thuê'}{f.criteria.radiusKm ? ` · Bán kính ${f.criteria.radiusKm} km` : ''}</p><div className="interest-actions"><button type="button" onClick={() => { setDraft(f.criteria); setWarnings([]) }}>Xem tiêu chí</button><button type="button" disabled={busy} onClick={() => void action(() => removeSearchInterest(f.id))}>Bỏ theo dõi</button></div></article>)}</section>
            <section><h3>Phòng mới phù hợp với bạn</h3><button type="button" disabled={busy || !current.settings.aiEnabled || current.rooms.length === 0} onClick={() => void action(rankInterestRooms)}>AI xếp hạng phòng hợp lệ</button><p>Chỉ tin mới sau khi theo dõi, đang hoạt động, chưa xem và khớp bộ lọc. Hãy liên hệ chủ tin để xác nhận còn phòng.</p>{current.rooms.length === 0 && <p>Chưa có phòng mới khớp tiêu chí. Bạn sẽ thấy gợi ý khi có tin phù hợp.</p>}{current.rooms.map(({ post, reason }) => <article key={post.id}><Link to={`/?post=${post.id}`} onClick={() => { void markInterestViewed(post.id).catch(() => {}); setOpen(false) }}><strong>{post.title}</strong></Link><p>{formatPrice(post.price)} · {post.area} m²</p><p>{post.address}</p><small>{reason}</small></article>)}<button type="button" disabled={busy} onClick={() => void action(getSearchInterests)}>Kiểm tra phòng mới</button></section>
            <section><h3>Quản lý dữ liệu</h3><p>Xóa lịch sử tìm kiếm không hủy những khu vực bạn đã chủ động theo dõi. Tắt cá nhân hóa ở trên để xóa toàn bộ và dừng gợi ý.</p>{confirmClear ? <div className="interest-actions"><button disabled={busy} type="button" onClick={() => { void action(clearInterestHistory); setConfirmClear(false) }}>Xác nhận xóa lịch sử</button><button type="button" onClick={() => setConfirmClear(false)}>Giữ lại</button></div> : <button disabled={busy} type="button" onClick={() => setConfirmClear(true)}>Xóa lịch sử tìm kiếm cá nhân hóa</button>}</section>
          </>}
        </>}
      </div>
      <footer><button type="button" onClick={closePanel}>Đóng</button></footer>
    </dialog>
  </>
}
