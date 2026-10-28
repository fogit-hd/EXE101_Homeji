import { useRef, useState } from 'react'
import { acceptMarketplaceOrder, getStoredSession, rejectMarketplaceOrder } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { announceSellerOrdersChanged, type SellerOrderAlert } from '../../lib/sellerOrderAlerts'

/** Only the server can accept/reject the whole checkout and settle its funds. */
export function SellerOrderDecision({ alert, ownerId, token }: { alert: SellerOrderAlert; ownerId: string; token: string }) {
  const [confirmReject, setConfirmReject] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const locked = useRef(false)
  const decide = async (choice: 'accept' | 'reject') => {
    if (locked.current || getStoredSession()?.accessToken !== token) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await (choice === 'accept' ? acceptMarketplaceOrder : rejectMarketplaceOrder)(alert.orders[0].id)
      if (getStoredSession()?.accessToken !== token) return
      setDone(choice === 'accept' ? 'Đã nhận đơn. Đang cập nhật danh sách…' : 'Đã từ chối đơn. Đang cập nhật danh sách…')
      announceSellerOrdersChanged(ownerId)
    } catch (cause) {
      if (getStoredSession()?.accessToken !== token) return
      setError(getErrorMessage(cause, 'Chưa xử lý được yêu cầu. Hãy thử lại.'))
      // Reconcile a possible timeout after the server committed the decision.
      announceSellerOrdersChanged(ownerId)
      locked.current = false
    } finally {
      setBusy(false)
    }
  }
  if (done) return <p className="seller-watch__decision-result" role="status">{done}</p>
  return <div className="seller-watch__decision">
    {confirmReject ? <>
      <p>Từ chối toàn bộ yêu cầu này? Hệ thống sẽ hoàn lại tiền đã thanh toán cho người mua.</p>
      <div className="seller-watch__decision-buttons">
        <button type="button" disabled={busy} onClick={() => setConfirmReject(false)}>Quay lại</button>
        <button type="button" className="seller-watch__reject" disabled={busy} onClick={() => void decide('reject')}>{busy ? 'Đang xử lý…' : 'Xác nhận từ chối'}</button>
      </div>
    </> : <div className="seller-watch__decision-buttons">
      <button type="button" disabled={busy} onClick={() => setConfirmReject(true)}>Từ chối</button>
      <button type="button" className="seller-watch__accept" disabled={busy} onClick={() => void decide('accept')}>{busy ? 'Đang xử lý…' : 'Nhận đơn'}</button>
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>
}
