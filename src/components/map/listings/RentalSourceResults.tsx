import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRentalSourceCatalog, sourceRoomHref, rentalSourceImageHref, type RentalSourceListing } from '../../../api/rentalSources'
import { getErrorMessage } from '../../../lib/errors'
import { formatPrice } from '../../../lib/labels'
import { listingReference } from '../../../lib/listingReference'
import { filterRentalSources, sourceHasLocation, sourceHasUnsupportedFilters } from '../../../lib/rentalSourceFilters'
import type { ListingQuery } from './listingAdapters'
import './RentalSourceResults.css'
import { useCatalogRefresh } from '../../../lib/useCatalogRefresh'

type Counts = { total: number; mapped: number }
export function RentalSourceResults({ query, onCount, onFocus, nativeCards = [] }: {
  nativeCards?: ReactNode[]
  query: ListingQuery
  onCount: (count: Counts) => void
  onFocus?: (location: { lat: number; lng: number }) => void
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
  const filtered = useMemo(() => filterRentalSources(rows, query), [rows, query])
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
    <header><p>{error ? 'Chưa tải được toàn bộ tin' : loaded ? `${combined.length} lựa chọn · Xem chi tiết và liên hệ ngay trên Homeji` : 'Đang tải toàn bộ danh sách…'}</p></header>
    <p className="source-results__note">Các ghim gần nhau được gộp thành cụm. Tin chưa có vị trí vẫn xuất hiện bên dưới; tình trạng còn phòng cần kiểm tra với người đăng.</p>
    {unsupported ? <p className="source-results__note">Một số tin chưa đủ dữ liệu để đối chiếu bộ lọc tiện ích, số người hoặc danh sách AI đang chọn. Bỏ các điều kiện này để xem thêm.</p> : null}
    {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p> : null}
    {loaded && !error && combined.length === 0 ? <p role="status">Không có phòng khớp bộ lọc.</p> : null}
    <ul className="map-listings__cards">{combined.slice(0, visible).map(item => {
      if (!item.row) return <li key={item.key}>{item.native}</li>
      const row = item.row
      const photo = row.imageUrls.map(rentalSourceImageHref).find(Boolean)
      return <li key={row.id}><article className="source-results__card">
        {photo ? <img src={photo} alt={row.title} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /> : null}
        <div><strong className="source-results__price">{formatPrice(row.price)} <small>/ tháng</small></strong><h3>{row.title}</h3><p>{row.address}</p>
          <span>{row.area} m² · {listingReference(row.id)}</span>
          <p className="source-results__publisher">{row.publisherName?.trim() || 'Chưa có tên người đăng'}</p>
          <small>{sourceHasLocation(row) ? 'Đã có vị trí trên bản đồ' : 'Chưa có vị trí trên bản đồ'}</small>
          <div className="source-results__actions">{onFocus && sourceHasLocation(row) ? <button type="button" onClick={() => onFocus({ lat: row.latitude!, lng: row.longitude! })}>Xem vị trí</button> : null}<Link to={sourceRoomHref(row.id)}>Xem chi tiết & liên hệ</Link></div>
        </div>
      </article></li>
    })}</ul>
    {combined.length > visible ? <button className="source-results__more" type="button" onClick={() => setVisible(value => value + 20)}>Xem thêm {Math.min(20, combined.length - visible)} tin ({visible}/{combined.length})</button> : null}
  </section>
}
