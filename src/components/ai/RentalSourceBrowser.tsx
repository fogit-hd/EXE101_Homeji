import { Link } from 'react-router-dom'
import { ChoicePicker } from '../ui/ChoicePicker'
import { useEffect, useRef, useState } from 'react'
import { rentalSourcePublisher, sourceRoomHref, rentalSourceImageHref, searchRentalSources, type RentalSourceListing } from '../../api/rentalSources'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice } from '../../lib/labels'
import { rentalSourceFreshness } from '../../lib/rentalSourceFreshness'
import './RentalSourceBrowser.css'

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
    } catch (reason) { if (current === request.current) setError(getErrorMessage(reason, 'Chưa tải được tin phòng.')) }
    finally { if (current === request.current) setLoading(false) }
  }
  const changeFilters = () => { request.current += 1; setItems([]); setPage(0); setLoading(false); setError('') }
  return <details className="rental-source-browser" onToggle={event => { if (event.currentTarget.open && page === 0 && !loading) void load(1) }}><summary>Xem thêm phòng</summary>
    <p>Kiểm tra tình trạng phòng, người cho thuê và các chi phí trước khi đặt lịch hoặc đặt cọc.</p>
    <form onSubmit={event => { event.preventDefault(); void load(1) }}>
      <label htmlFor="source-keyword">Từ khóa tin phòng</label><input id="source-keyword" maxLength={200} value={keyword} onChange={event => { changeFilters(); setKeyword(event.target.value) }} />
      <label htmlFor="source-district">Khu vực</label><ChoicePicker id="source-district" value={district} onChange={event => { changeFilters(); setDistrict(event.target.value) }}><option value="">Thủ Đức & Quận 9</option><option value="thu-duc">Thủ Đức</option><option value="quan-9">Quận 9</option></ChoicePicker>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>{loading ? 'Đang tải…' : 'Xem tin phòng'}</button>
    </form>
    {error ? <p role="alert">{error}</p> : null}
    {page > 0 && !loading && !items.length ? <p>Không có tin phòng cho trang này.</p> : null}
    {items.map(item => {
      const freshness = rentalSourceFreshness(item.sourceExpiresAt, item.sourceCheckedAt)
      return <article key={item.id} className="ai-search-review__listing">
        <strong>{item.title}</strong><span>{item.address}</span>
        <span>{rentalSourcePublisher(item.publisherName)}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{item.imageUrls.map(rentalSourceImageHref).filter((url): url is string => url !== null).slice(0, 3).map(url =>
          <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Ảnh từ tin phòng: ${item.title}`} loading="lazy" referrerPolicy="no-referrer" style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 8 }} onError={event => { event.currentTarget.hidden = true }} /></a>
        )}</div>
        <small>Ảnh phòng do người đăng cung cấp; cần kiểm tra thực tế trước khi giao dịch.</small>
        <span>Giá tại lần thu thập: {item.price > 0 ? formatPrice(item.price) : 'Chưa có thông tin'} · Diện tích: {item.area > 0 ? `${item.area} m²` : 'Chưa có thông tin'}</span>
        <small>Lưu ngày: {dateLabel(item.collectedAt)} · cập nhật: {dateLabel(item.sourceUpdatedAt)}</small>
        <small>{freshness === 'expired' ? 'Tin đã quá ngày hết hạn.' : freshness === 'notExpired' ? 'Chưa quá ngày hết hạn đã ghi nhận; chưa xác nhận phòng còn trống.' : 'Chưa có thông tin kiểm tra thời hạn quảng cáo.'}</small>
        {item.sourceCheckedAt ? <small>Kiểm tra: {dateLabel(item.sourceCheckedAt)} · ngày hết hạn ghi nhận: {dateLabel(item.sourceExpiresAt ?? null)}</small> : null}
        <small>Chưa có thông tin xác nhận về tiền cọc, đơn vị điện/nước, tiện ích và số người.</small>
        <Link to={sourceRoomHref(item.id)}>Xem chi tiết & liên hệ</Link>
      </article>
    })}
    {page > 0 ? <div><button type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)}>Trang trước</button> <span>Trang {page}</span> <button type="button" disabled={loading || items.length < 10 || page >= 1000} onClick={() => void load(page + 1)}>Trang sau</button></div> : null}
  </details>
}
