import { WALLET_HISTORY_PATH } from '../lib/marketplaceNavigation'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyReceipts, type TransactionReceipt } from '../api/receipts'
import { getErrorMessage } from '../lib/errors'
import { marketplaceHref } from '../components/shell/navigation'
import './receipts.css'

const titles: Record<TransactionReceipt['event'], string> = {
  1: 'Nạp tiền thành công', 2: 'Thanh toán thành công', 3: 'Yêu cầu rút tiền',
  4: 'Rút tiền hoàn tất', 5: 'Rút tiền bị từ chối · đã hoàn vào ví',
  6: 'Thanh toán mua hàng', 7: 'Hoàn tiền mua hàng vào ví',
}
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 })
const time = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' })
function emailStatus(receipt: TransactionReceipt) {
  if (!receipt.emailScheduled) return 'Biên nhận lịch sử · không gửi email'
  if (receipt.emailSentAt) return 'Đã chuyển cho dịch vụ email'
  if (receipt.emailFailed) return 'Email chưa được xác nhận · xem biên nhận tại đây'
  return 'Email đang chờ gửi'
}
function issuedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Chưa có thời gian' : time.format(date)
}

export function ReceiptsPage() {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<TransactionReceipt[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<TransactionReceipt | null>(null)
  const previewHeading = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!selected) return
    previewHeading.current?.focus({ preventScroll: true })
    previewHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [selected])
  useEffect(() => {
    const controller = new AbortController()
    void getMyReceipts(page, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setItems(result.items)
      setHasMore(result.hasMore)
      setLoading(false)
    }).catch(err => {
      if (controller.signal.aborted) return
      setError(getErrorMessage(err, 'Không tải được lịch sử biên nhận.'))
      setLoading(false)
    })
    return () => controller.abort()
  }, [page, refresh])
  function load(nextPage: number) {
    setPage(nextPage)
    setRefresh(value => value + 1)
    setLoading(true)
    setError('')
    setItems([])
    setSelected(null)
  }
  return <div className="container page receipts-page" data-glass-exclude>
    <header className="receipts-page__header"><div><p className="receipts-eyebrow">VÍ HOMEJI / BIÊN NHẬN</p>
      <h1 className="page-title">Giao dịch của bạn</h1><p>Xem lại biên nhận và trạng thái gửi email tại một nơi.</p></div>
      <div className="receipts-actions"><Link className="btn" to={WALLET_HISTORY_PATH}>Xem lịch sử giao dịch</Link><Link className="btn" to={marketplaceHref('wallet')}>Về ví Homeji →</Link></div></header>
    <div className="receipts-toolbar"><p>Thời gian Việt Nam (UTC+7) · Không phải hóa đơn thuế/VAT.</p>
      <button type="button" className="btn" disabled={loading} onClick={() => load(page)}>Làm mới</button></div>
    {error && <p role="alert" className="receipts-error">{error}</p>}
    {loading ? <p role="status">Đang tải biên nhận…</p> : !error && items.length === 0 ? <p className="receipts-empty">Chưa có biên nhận giao dịch.</p> : null}
    <ul className="receipts-list" aria-label="Danh sách biên nhận">
      {items.map(receipt => <li key={receipt.id} className={`receipts-list__item${selected?.id === receipt.id ? ' is-selected' : ''}`}>
        <span className="receipts-list__icon" aria-hidden="true">↗</span>
        <div><h2>{titles[receipt.event]}</h2><time dateTime={receipt.issuedAt}>{issuedAt(receipt.issuedAt)}</time>
          <p className="receipts-reference">{receipt.referenceCode}</p><p className="receipts-email">{emailStatus(receipt)}</p></div>
        <div className="receipts-list__action"><strong>{money.format(receipt.amount)}</strong>
          <button type="button" className="btn" disabled={loading} aria-expanded={selected?.id === receipt.id}
            onClick={event => { opener.current = event.currentTarget; setSelected(receipt) }}>Xem biên nhận</button></div>
      </li>)}
    </ul>
    <nav aria-label="Phân trang biên nhận" className="receipts-actions">
      <button className="btn" disabled={loading || page === 1} onClick={() => load(page - 1)}>Trang trước</button>
      <span>Trang {page}</span><button className="btn" disabled={loading || !hasMore} onClick={() => load(page + 1)}>Trang sau</button>
    </nav>
    {selected && <section className="receipts-preview" aria-label="Chi tiết biên nhận">
      <header><div><p className="receipts-eyebrow">BIÊN NHẬN GIAO DỊCH</p><h2 ref={previewHeading} tabIndex={-1}>{titles[selected.event]}</h2></div>
        <button className="btn" onClick={() => { setSelected(null); opener.current?.focus() }}>Đóng chi tiết</button></header>
      <p className="receipts-preview__amount">{money.format(selected.amount)}</p>
      <dl><div><dt>Thời gian</dt><dd>{issuedAt(selected.issuedAt)}</dd></div>
        <div><dt>Mã giao dịch</dt><dd>{selected.referenceCode}</dd></div>
        <div><dt>Mã biên nhận</dt><dd>HJ-{selected.id.replaceAll('-', '')}</dd></div>
        <div><dt>Nội dung</dt><dd>{selected.description}</dd></div>
        <div><dt>Email</dt><dd>{emailStatus(selected)}</dd></div></dl>
      <p className="receipts-preview__note">{selected.event === 3 ? 'Yêu cầu rút tiền chưa xác nhận tiền đã tới tài khoản ngân hàng. ' : ''}Biên nhận giao dịch Homeji không phải hóa đơn thuế/VAT.</p>
    </section>}
  </div>
}