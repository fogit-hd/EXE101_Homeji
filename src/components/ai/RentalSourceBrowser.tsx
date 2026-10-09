import { useEffect, useRef, useState } from 'react'
import { rentalSourceHref, searchRentalSources, type RentalSourceListing } from '../../api/rentalSources'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice } from '../../lib/labels'
import { rentalSourceFreshness } from '../../lib/rentalSourceFreshness'

const dateLabel = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có thông tin'

export function RentalSourceBrowser() {
  const [keyword, setKeyword] = useState('')
  const [district, setDistrict] = useState('')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<RentalSourceListing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  useEffect(() => () => { request.current += 1 }, [])
  const load = async (nextPage: number) => {
    const current = ++request.current
    setLoading(true); setError(''); setItems([])
    try {
      const response = await searchRentalSources({ keyword, district, page: nextPage })
      if (current === request.current) { setItems(response); setPage(nextPage) }
    } catch (reason) { if (current === request.current) setError(getErrorMessage(reason, 'Chưa tải được tin nguồn.')) }
    finally { if (current === request.current) setLoading(false) }
  }
  const changeFilters = () => { request.current += 1; setItems([]); setPage(0); setLoading(false); setError('') }
  return <details className="rental-source-browser"><summary>Tin từ nguồn ngoài · tham khảo và kiểm tra nguồn</summary>
    <p>Đây là quảng cáo được thu thập từ website khác. Homeji chưa xác minh phòng còn trống, người cho thuê, địa chỉ hoặc phí. Tin nguồn không được coi là tin phòng đã duyệt để đặt lịch hay đặt cọc.</p>
    <form onSubmit={event => { event.preventDefault(); void load(1) }}>
      <label htmlFor="source-keyword">Từ khóa tin nguồn</label><input id="source-keyword" maxLength={200} value={keyword} onChange={event => { changeFilters(); setKeyword(event.target.value) }} />
      <label htmlFor="source-district">Khu vực</label><select id="source-district" value={district} onChange={event => { changeFilters(); setDistrict(event.target.value) }}><option value="">Thủ Đức & Quận 9</option><option value="thuduc">Thủ Đức</option><option value="quan9">Quận 9</option></select>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>{loading ? 'Đang tải…' : 'Xem tin nguồn'}</button>
    </form>
    {error ? <p role="alert">{error}</p> : null}
    {page > 0 && !loading && !items.length ? <p>Không có tin nguồn cho trang này.</p> : null}
    {items.map(item => {
      const href = rentalSourceHref(item.sourceUrl)
      const freshness = rentalSourceFreshness(item.sourceExpiresAt, item.sourceCheckedAt)
      return <article key={item.id} className="ai-search-review__listing">
        <strong>{item.title}</strong><span>{item.address}</span>
        <span>Giá tại lần thu thập: {item.price > 0 ? formatPrice(item.price) : 'Chưa có thông tin'} · Diện tích: {item.area > 0 ? `${item.area} m²` : 'Chưa có thông tin'}</span>
        <small>Nguồn: {item.source} · mã {item.sourceId}</small>
        <small>Thu thập: {dateLabel(item.collectedAt)} · ngày cập nhật nguồn: {dateLabel(item.sourceUpdatedAt)}</small>
        <small>{freshness === 'expired' ? 'Theo dữ liệu nguồn đã kiểm tra: quảng cáo đã quá ngày hết hạn.' : freshness === 'notExpired' ? 'Chưa quá ngày hết hạn đã ghi nhận; chưa xác nhận phòng còn trống.' : 'Chưa có thông tin kiểm tra thời hạn quảng cáo.'}</small>
        {item.sourceCheckedAt ? <small>Kiểm tra nguồn: {dateLabel(item.sourceCheckedAt)} · ngày hết hạn ghi nhận: {dateLabel(item.sourceExpiresAt ?? null)}</small> : null}
        <small>Chưa có thông tin xác nhận về tiền cọc, đơn vị điện/nước, tiện ích và số người.</small>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer">Mở quảng cáo gốc để kiểm tra</a> : <span>Đường dẫn nguồn không hợp lệ.</span>}
      </article>
    })}
    {page > 0 ? <div><button type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)}>Trang trước</button> <span>Trang {page}</span> <button type="button" disabled={loading || items.length < 10 || page >= 1000} onClick={() => void load(page + 1)}>Trang sau</button></div> : null}
  </details>
}
