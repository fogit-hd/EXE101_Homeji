import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyReceiptHtml, getMyReceipts, type TransactionReceipt } from '../api/receipts'
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

export function ReceiptsPage() {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<TransactionReceipt[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<{ id: string; html: string } | null>(null)
  const [opening, setOpening] = useState(false)
  const openLock = useRef(false)
  const generation = useRef(0)
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

  useEffect(() => () => { generation.current++ }, [])

  function load(nextPage: number) {
    setPage(nextPage)
    setRefresh(value => value + 1)
    setLoading(true)
    setError('')
    setItems([])
    setSelected(null)
    generation.current++
  }

  async function open(receipt: TransactionReceipt) {
    if (openLock.current) return
    openLock.current = true
    setOpening(true)
    setError('')
    const requestGeneration = generation.current
    try {
      const html = await getMyReceiptHtml(receipt.id)
      if (requestGeneration === generation.current) setSelected({ id: receipt.id, html })
    } catch (err) {
      if (requestGeneration === generation.current) setError(getErrorMessage(err, 'Không mở được biên nhận.'))
    } finally {
      openLock.current = false
      if (requestGeneration === generation.current) setOpening(false)
    }
  }

  function download() {
    if (!selected) return
    const url = URL.createObjectURL(new Blob([selected.html], { type: 'text/html;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `Homeji-HJ-${selected.id}.html`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="container page receipts-page">
    <header className="receipts-page__header"><div><h1 className="page-title">Lịch sử biên nhận</h1>
      <p>Biên nhận nạp tiền, thanh toán và từng bước xử lý rút tiền. Thời gian theo Việt Nam (UTC+7).</p></div>
      <Link className="btn" to={marketplaceHref('wallet')}>Về ví Homeji</Link></header>
    <p>Biên nhận giao dịch Homeji không phải hóa đơn thuế/VAT.</p>
    {error && <p role="alert" className="auth-card__error">{error}</p>}
    <button type="button" className="btn" disabled={loading || opening} onClick={() => load(page)}>Làm mới</button>
    {loading ? <p role="status">Đang tải biên nhận…</p> : !error && items.length === 0 ? <p>Chưa có biên nhận giao dịch.</p> : null}
    <ul className="receipts-list" aria-label="Danh sách biên nhận">
      {items.map(receipt => <li key={receipt.id} className="card receipts-list__item">
        <div><h2>{titles[receipt.event]}</h2><p><strong>{money.format(receipt.amount)}</strong> · {time.format(new Date(receipt.issuedAt))}</p>
          <p>{receipt.description}</p><p className="receipts-reference">Mã giao dịch: {receipt.referenceCode}</p>
          <p className="receipts-reference">Biên nhận: HJ-{receipt.id.replaceAll('-', '')}</p>
          <p>{emailStatus(receipt)}</p></div>
        <button type="button" className="btn" disabled={opening || loading} onClick={event => { opener.current = event.currentTarget; void open(receipt) }}>Xem biên nhận</button>
      </li>)}
    </ul>
    <nav aria-label="Phân trang biên nhận" className="receipts-actions">
      <button className="btn" disabled={loading || opening || page === 1} onClick={() => load(page - 1)}>Trang trước</button>
      <span>Trang {page}</span><button className="btn" disabled={loading || opening || !hasMore} onClick={() => load(page + 1)}>Trang sau</button>
    </nav>
    {opening && <p role="status">Đang mở biên nhận…</p>}
    {selected && <section className="card receipts-preview" aria-label="Chi tiết biên nhận">
      <div className="receipts-actions"><h2 ref={previewHeading} tabIndex={-1}>Chi tiết biên nhận</h2><button className="btn" onClick={download}>Tải HTML</button>
        <button className="btn" onClick={() => { setSelected(null); opener.current?.focus() }}>Đóng chi tiết</button></div>
      <iframe title="Biên nhận giao dịch Homeji" sandbox="" srcDoc={selected.html} referrerPolicy="no-referrer" />
    </section>}
  </div>
}
