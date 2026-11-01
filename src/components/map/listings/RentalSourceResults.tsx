import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getRentalSourceCatalog, sourceRoomHref, rentalSourceImageHref, rentalSourceLabel, type RentalSourceListing } from '../../../api/rentalSources'
import { getErrorMessage } from '../../../lib/errors'
import { formatPrice } from '../../../lib/labels'
import { listingReference } from '../../../lib/listingReference'
import { filterRentalSources, sourceHasLocation, sourceHasUnsupportedFilters } from '../../../lib/rentalSourceFilters'
import type { ListingQuery } from './listingAdapters'
import './RentalSourceResults.css'

type Counts = { total: number; mapped: number }
export function RentalSourceResults({ query, onCount, onFocus }: {
  query: ListingQuery
  onCount: (count: Counts) => void
  onFocus?: (location: { lat: number; lng: number }) => void
}) {
  const [rows, setRows] = useState<RentalSourceListing[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [visible, setVisible] = useState(20)
  useEffect(() => {
    let active = true
    void getRentalSourceCatalog().then(result => { if (active) { setRows(result); setLoaded(true); setError('') } })
      .catch(reason => { if (active) { setLoaded(true); setError(getErrorMessage(reason, 'Chưa tải được danh sách tin từ các website đăng tin.')) } })
    return () => { active = false }
  }, [attempt])
  const filtered = useMemo(() => filterRentalSources(rows, query), [rows, query])
  const counts = useMemo(() => ({ total: filtered.length, mapped: filtered.filter(sourceHasLocation).length }), [filtered])
  useEffect(() => { onCount(counts) }, [onCount, counts])
  const unsupported = sourceHasUnsupportedFilters(query)
  return <section className="source-results" aria-label="Thêm phòng từ các website đăng tin">
    <header><strong>Thêm lựa chọn phòng</strong><p>{error ? 'Chưa tải được toàn bộ tin' : loaded ? `${counts.total} tin · ${counts.mapped} có vị trí trên bản đồ · ${counts.total - counts.mapped} chưa định vị` : 'Đang tải toàn bộ danh sách…'}</p></header>
    <p className="source-results__note">Các ghim gần nhau được gộp thành cụm. Tin chưa có vị trí vẫn xuất hiện bên dưới; tình trạng còn phòng cần kiểm tra với người đăng.</p>
    {unsupported ? <p className="source-results__note">Tin từ các website khác chưa đủ dữ liệu để đối chiếu bộ lọc tiện ích, số người hoặc danh sách AI đang chọn. Bỏ các điều kiện này để xem thêm.</p> : null}
    {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p> : null}
    {filtered.slice(0, visible).map(row => {
      const photo = row.imageUrls.map(rentalSourceImageHref).find(Boolean)
      return <article className="source-results__card" key={row.id}>
        {photo ? <img src={photo} alt={row.title} loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /> : null}
        <div><strong className="source-results__price">{formatPrice(row.price)} <small>/ tháng</small></strong><h3>{row.title}</h3><p>{row.address}</p>
          <span>{row.area} m² · {listingReference(row.id, row.source, row.sourceId)}</span>
          <p className="source-results__publisher">{row.publisherName?.trim() || rentalSourceLabel(row.source)}</p>
          <small>{sourceHasLocation(row) ? 'Vị trí theo tin gốc' : 'Chưa có vị trí trên bản đồ'}</small>
          <div className="source-results__actions">{onFocus && sourceHasLocation(row) ? <button type="button" onClick={() => onFocus({ lat: row.latitude!, lng: row.longitude! })}>Xem vị trí</button> : null}<Link to={sourceRoomHref(row.id)}>Xem chi tiết & liên hệ</Link></div>
        </div>
      </article>
    })}
    {filtered.length > visible ? <button className="source-results__more" type="button" onClick={() => setVisible(value => value + 20)}>Xem thêm {Math.min(20, filtered.length - visible)} tin ({visible}/{filtered.length})</button> : null}
  </section>
}
