import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { claimReferral, createReferralCode, getReferrals, type ReferralSummary } from '../api/referrals'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import { formatPrice } from '../lib/labels'
import { profileSetupUrl } from '../lib/profileSetup'
import './ReferralsPage.css'
export function ReferralsPage() {
 const { isAuthenticated, needsProfileSetup, isLoading } = useAuth()
 const [params] = useSearchParams()
 const [now] = useState(() => Date.now())
 const [code, setCode] = useState(() => params.get('code') || '')
 const [data, setData] = useState<ReferralSummary | null>(null)
 const [error, setError] = useState('')
 const [notice, setNotice] = useState('')
 const [busy, setBusy] = useState(false)
 useEffect(() => { let active = true; if (isAuthenticated) void getReferrals().then(result => { if (active) setData(result) }).catch(reason => { if (active) setError(getErrorMessage(reason)) }); return () => { active = false } }, [isAuthenticated])
 const act = async (claim: boolean) => { if (busy) return; setBusy(true); setError(''); setNotice(''); try { setData(await (claim ? claimReferral(code.trim()) : createReferralCode())); setNotice(claim ? 'Quà đã có trong tài khoản của cả hai. Xem voucher bên dưới.' : 'Mã mời đã sẵn sàng. Sao chép link và gửi cho bạn bè.') } catch (reason) { setError(getErrorMessage(reason)) } finally { setBusy(false) } }
 const returnTo = '/referrals' + (code ? '?code=' + encodeURIComponent(code) : '')
 const inviteUrl = data?.code ? window.location.origin + '/referrals?code=' + data.code : ''
 return <main className="referrals-page" data-glass-exclude>
  <Link to="/">← Trang chủ</Link><h1>Mời bạn, cả hai cùng có quà</h1>
  <p>Mỗi người nhận bộ 4 voucher, tổng mức giảm tối đa <strong>50.000đ</strong>. Quà được cấp sau khi bạn mới xác nhận email và nhận lời mời.</p>
  <ol><li>Gửi link mời cho bạn mới.</li><li>Bạn đăng ký, xác nhận email và lưu Thông tin cơ bản.</li><li>Mở lại link trong 7 ngày từ khi đăng ký, chọn Nhận quà cho cả hai.</li></ol>
  <section><h2>Quà của mỗi người</h2><ul><li>3 voucher đồ ăn: giảm 5%, tối đa 10.000đ/voucher, đơn từ 100.000đ.</li><li>1 voucher VIP: giảm 20%, tối đa 20.000đ, gói từ 50.000đ; thanh toán bằng ví Homeji.</li></ul><p>Hạn 30 ngày từ lúc nhận. Mỗi lần thanh toán dùng 1 voucher. Voucher không cộng vào số dư, không rút hoặc đổi thành tiền. Đơn đồ ăn bị hủy được trả lại voucher với hạn dùng ban đầu.</p></section>
  <p>Đợt này có 10 lượt mời nhận quà, ngân sách tối đa 1.000.000đ. Mỗi người mời nhận thưởng tối đa 5 lượt; mỗi tài khoản mới chỉ nhận quà đăng ký một lần. Tài khoản đã nhận thưởng khi mời người khác không thể nhận thêm quà đăng ký bằng mã khác.</p>
  {data && <p role="status">Còn {data.remainingPairs} lượt nhận quà · Bạn đã mời thành công {data.successfulInvites} người.</p>}
  {error && <p className="referral-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  {isLoading ? <p role="status">Đang kiểm tra tài khoản…</p> : !isAuthenticated ? <div className="referral-actions"><Link className="btn btn-primary" to="/register" state={{ from: returnTo }}>Đăng ký để nhận quà</Link><Link className="btn btn-secondary" to="/login" state={{ from: returnTo }}>Đã có tài khoản? Đăng nhập</Link></div> : needsProfileSetup ? <Link className="btn btn-primary" to={profileSetupUrl(returnTo)}>Lưu Thông tin cơ bản trước</Link> : <>
  <section><h2>Link mời của bạn</h2>{inviteUrl ? <><input className="form-input" aria-label="Link mời của bạn" value={inviteUrl} readOnly /><button className="btn btn-secondary" disabled={busy} onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => setNotice('Đã sao chép link mời.')).catch(() => setError('Chưa sao chép được. Bạn có thể chọn và sao chép link ở ô trên.'))}>Sao chép link</button></> : <button className="btn btn-primary" disabled={busy} onClick={() => void act(false)}>Tạo link mời</button>}</section>
  <form onSubmit={e => { e.preventDefault(); void act(true) }}><h2>Bạn có mã mời?</h2><label htmlFor="referral-code">Mã do bạn bè gửi</label><input id="referral-code" className="form-input" value={code} maxLength={24} required pattern="[A-Fa-f0-9]{24}" onChange={e => setCode(e.target.value)} /><button className="btn btn-primary" disabled={busy || data?.received || data?.remainingPairs === 0}>{data?.received ? 'Bạn đã nhận quà' : busy ? 'Đang xử lý…' : 'Nhận quà cho cả hai'}</button></form>
  <section><h2>Voucher của bạn</h2>{!data?.vouchers.length ? <p>Chưa có voucher. Quà sẽ hiện tại đây khi có lời mời hợp lệ.</p> : <ul className="referral-vouchers">{data.vouchers.map(v => <li key={v.id}><strong>{v.purpose === 'food' ? 'Đồ ăn' : 'VIP'} · giảm {v.rate * 100}% tối đa {formatPrice(v.maximumDiscount)}</strong><p>Đơn từ {formatPrice(v.minimumSpend)} · Hạn {new Date(v.expiresAt).toLocaleString('vi-VN')}</p>{v.used ? <span>Đã dùng</span> : Date.parse(v.expiresAt) <= now ? <span>Đã hết hạn</span> : <Link to={v.purpose === 'food' ? '/?section=marketplace&market=food' : '/?section=payments'}>Dùng voucher →</Link>}</li>)}</ul>}</section></>}
 </main>
}
