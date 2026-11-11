import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRentalSourceCatalog, rentalSourcePublisher, sourceRoomHref, rentalSourceImageHref, type RentalSourceListing } from '../../../api/rentalSources'
import { getErrorMessage } from '../../../lib/errors'
import { formatPrice } from '../../../lib/labels'
import { isApartmentListing } from '../../../lib/rentalPropertyCategory'
import { filterRentalSourcesForList, sourceHasLocation, sourceHasUnsupportedFilters } from '../../../lib/rentalSourceFilters'
import type { ListingQuery } from './listingAdapters'
import './RentalSourceResults.css'
import { useCatalogRefresh } from '../../../lib/useCatalogRefresh'

type Counts = { total: number; mapped: number }
// What students scan for first; shown highlighted on every card.
const STUDENT_KEY_AMENITIES = new Set(['Máy lạnh', 'Máy nước nóng', 'Bếp', 'Giờ tự do', 'Không chung chủ'])
function formatSourceDate(value: string | null | undefined): string | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }).format(timestamp)
    : null
}

export function RentalSourceResults({ query, onCount, onFocus, onResetFilters, nativeCards = [], nativeIds = [] }: {
  nativeIds?: string[]
  nativeCards?: ReactNode[]
  query: ListingQuery
  onCount: (count: Counts) => void
  onFocus?: (location: { lat: number; lng: number }) => void
  onResetFilters?: () => void
}) {
  const [rows, setRows] = useState<RentalSourceListing[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [visible, setVisible] = useState(20)
  const revision = useCatalogRefresh()
  useEffect(() => {
    let active = true
    void getRentalSourceCatalog().then(result => { if (active) { setRows(result); setLoaded(true); setError('') } })
      .catch(reason => { if (active) { setLoaded(true); setError(getErrorMessage(reason, 'Chưa tải được danh sách phòng.')) } })
    return () => { active = false }
  }, [attempt, revision])
  const nativeIdKey = [...nativeIds].sort().join('|')
  const filtered = useMemo(() => {
    const visibleNativeIds = new Set(nativeIdKey.split('|'))
    return filterRentalSourcesForList(rows, query).filter(row => !visibleNativeIds.has(row.id))
  }, [rows, query, nativeIdKey])
  const counts = useMemo(() => ({ total: filtered.length, mapped: filtered.filter(sourceHasLocation).length }), [filtered])
  useEffect(() => { onCount(counts) }, [onCount, counts])
  const unsupported = sourceHasUnsupportedFilters(query)
  // Mix both inventories in one paged list, so imported rooms are not hidden
  // behind every native card. Source identity and trust flags stay separate.
  const combined: Array<{ key: string; native?: ReactNode; row?: RentalSourceListing }> = []
  for (let index = 0; index < Math.max(nativeCards.length, filtered.length); index++) {
    if (index < nativeCards.length) combined.push({ key: `native-${index}`, native: nativeCards[index] })
    if (index < filtered.length) combined.push({ key: filtered[index].id, row: filtered[index] })
  }
  return <section className="source-results" aria-label="Danh sách phòng">
    {!loaded && !error ? <p className="source-results__note" role="status">Đang tải danh sách…</p> : null}
    {unsupported ? <p className="source-results__note">Một số tin chưa đủ dữ liệu để đối chiếu bộ lọc tiện ích, số người hoặc danh sách AI đang chọn. Bỏ các điều kiện này để xem thêm.</p> : null}
    {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p> : null}
    {loaded && !error && combined.length === 0 ? (
      <div className="map-listings__smart-empty" role="status">
        <div className="map-listings__empty-icon" aria-hidden="true">🏠✨</div>
        <h3 className="map-listings__empty-title">Chưa tìm thấy phòng phù hợp với yêu cầu của bạn</h3>
        <p className="map-listings__empty-desc">
          Chưa có phòng phù hợp. Thử bỏ bớt bộ lọc hoặc đăng tin tìm phòng để các chủ trọ và bạn cùng phòng chủ động kết nối!
        </p>
        <div className="map-listings__empty-actions">
          {onResetFilters ? (
            <button type="button" className="btn-empty-reset" onClick={onResetFilters}>
              Đặt lại bộ lọc
            </button>
          ) : null}
          <Link to="/wanted" className="btn-empty-cta">
            📝 Đăng tin tìm phòng ngay
          </Link>
          <Link to="/invitations" className="btn-empty-secondary">
            👥 Tìm bạn ở ghép
          </Link>
        </div>
      </div>
    ) : null}
    <ul className="map-listings__cards">{combined.slice(0, visible).map(item => {
      if (!item.row) return <li key={item.key}>{item.native}</li>
      const row = item.row
      const photo = row.imageUrls.map(rentalSourceImageHref).find(Boolean)
      const updatedAt = formatSourceDate(row.sourceUpdatedAt)
      return <li key={row.id}><article className="map-listings__card source-results__card">
        <Link className="source-results__photo" to={sourceRoomHref(row.id)} aria-label={`Xem phòng: ${row.title}`}>
          <span className="source-results__empty-photo">Chưa có ảnh</span>
          {photo ? <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /> : null}
          {photo ? <span className="source-results__photo-count">{row.imageUrls.length} ảnh</span> : null}
        </Link>
        <div className="source-results__copy">
          <strong className="map-listings__price source-results__price">{formatPrice(row.price)} <small>/ tháng</small></strong>
          <h3 className="map-listings__name"><Link to={sourceRoomHref(row.id)}>{row.title}</Link></h3>
          <p className="map-listings__address">{row.address}</p>
          <div className="map-listings__meta">{row.area > 0 ? <span>{row.area} m²</span> : null}<span>{isApartmentListing(row.title) ? 'Căn hộ' : 'Phòng trọ'}</span></div>
          {row.amenityHighlights?.length ? <ul className="source-results__amenities" aria-label="Tiện ích nổi bật">{row.amenityHighlights.slice(0, 6).map(value => <li key={value} className={STUDENT_KEY_AMENITIES.has(value) ? 'is-key' : undefined}>{value}</li>)}</ul> : null}
          <div className="map-listings__facts">{row.depositLabel ? <span>{row.depositLabel}</span> : null}{updatedAt ? <time dateTime={row.sourceUpdatedAt ?? undefined}>Cập nhật {updatedAt}</time> : null}</div>
          <p className="source-results__publisher">{rentalSourcePublisher(row.publisherName)}</p>
        </div>
        <div className="source-results__actions">
          {onFocus && sourceHasLocation(row) ? <button type="button" data-glass-exclude onClick={() => onFocus({ lat: row.latitude!, lng: row.longitude! })}>Xem vị trí trên bản đồ</button> : null}
          <Link className="map-listings__card-open" data-glass-exclude to={sourceRoomHref(row.id)}>Chi tiết & liên hệ <span aria-hidden="true">↗</span></Link>
        </div>
      </article></li>
    })}</ul>
    {combined.length > visible ? <button className="source-results__more" type="button" onClick={() => setVisible(value => value + 20)}>Xem thêm {Math.min(20, combined.length - visible)} tin ({visible}/{combined.length})</button> : null}
  </section>
}
