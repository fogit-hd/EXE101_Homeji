import { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { claimReferral, createReferralCode, getReferrals, type ReferralSummary } from '../api/referrals'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import { formatPrice } from '../lib/labels'
import { profileSetupUrl } from '../lib/profileSetup'
import { canClaimReferral, groupVouchers, referralPanel, type VoucherGroup } from '../lib/referralView'
import './ReferralsPage.css'

const MAX_INVITES = 5
const CAMPAIGN_PAIRS = 10
const GIFT_TOTAL = formatPrice(50000)

const RULES = [
  `Đợt này có ${CAMPAIGN_PAIRS} lượt nhận quà. Hết lượt thì chương trình dừng.`,
  `Bạn được thưởng tối đa ${MAX_INVITES} lần mời, tương ứng 20 voucher.`,
  'Mỗi tài khoản mới chỉ nhận quà đăng ký một lần. Tài khoản đã được thưởng nhờ mời bạn thì không nhận thêm quà đăng ký.',
  'Voucher có hạn 30 ngày kể từ lúc nhận. Mỗi lần thanh toán dùng một voucher.',
  'Voucher không đổi thành tiền, không cộng vào số dư ví và không chuyển cho người khác.',
  'Đơn đồ ăn bị hủy sẽ được trả lại voucher, giữ nguyên hạn dùng ban đầu.',
]

export function ReferralsPage() {
  const { isAuthenticated, needsProfileSetup, isLoading } = useAuth()
  const [params] = useSearchParams()
  const [now] = useState(() => Date.now())
  const [code, setCode] = useState(() => params.get('code')?.trim() || '')
  const [data, setData] = useState<ReferralSummary | null>(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [showQr, setShowQr] = useState(false)
  const codeInputId = useId()

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let active = true
    void getReferrals()
      .then(result => { if (active) setData(result) })
      .catch(reason => { if (active) setLoadError(getErrorMessage(reason)) })
    return () => { active = false }
  }, [isAuthenticated, attempt])

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(null), 2400)
    return () => window.clearTimeout(timer)
  }, [copied])

  const act = async (claim: boolean) => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      setData(await (claim ? claimReferral(code) : createReferralCode()))
      setNotice(claim ? 'Đã nhận quà. Bạn và người mời đều có 4 voucher.' : 'Đã tạo link mời. Sao chép và gửi cho bạn bè.')
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string, kind: 'code' | 'link') => {
    setNotice('')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setError('')
    } catch {
      setError('Chưa sao chép được. Bạn hãy chọn nội dung rồi sao chép thủ công.')
    }
  }

  const invited = Boolean(params.get('code'))
  const returnTo = '/referrals' + (code ? '?code=' + encodeURIComponent(code) : '')
  const inviteUrl = data?.code ? `${window.location.origin}/referrals?code=${data.code}` : ''
  const canShareNatively = typeof navigator.share === 'function'
  const panel = referralPanel({ isLoading, isAuthenticated, needsProfileSetup, hasData: Boolean(data), hasError: Boolean(loadError), hasCode: Boolean(inviteUrl) })
  const showClaim = !needsProfileSetup && canClaimReferral(data)
  const claimFirst = invited && showClaim
  const showAside = isAuthenticated && !needsProfileSetup && Boolean(data)
  const campaignEnded = data?.remainingPairs === 0
  const vouchers = groupVouchers(data?.vouchers ?? [], now)

  const claimForm = (
    <form className="referrals-panel" onSubmit={event => { event.preventDefault(); void act(true) }}>
      <h2>{claimFirst ? 'Bạn được mời nhận 4 voucher' : 'Nhận quà bằng mã mời'}</h2>
      <p>Dành cho tài khoản đăng ký trong 7 ngày gần đây và đã xác nhận email.</p>
      <label htmlFor={codeInputId}>Mã mời</label>
      <input
        id={codeInputId}
        className="form-input referrals-input referrals-input--code"
        value={code}
        maxLength={24}
        required
        pattern="[A-Fa-f0-9]{24}"
        title="Mã mời gồm 24 ký tự, chỉ có chữ số và các chữ từ A đến F."
        autoComplete="off"
        spellCheck={false}
        onChange={event => setCode(event.target.value.trim())}
      />
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang nhận quà…' : 'Nhận quà'}</button>
    </form>
  )

  const invitePanel = (
    <section className="referrals-panel" aria-labelledby="referrals-invite-title">
      {panel === 'loading' ? <p role="status" id="referrals-invite-title">Đang tải…</p> : null}

      {panel === 'guest' ? <>
        <h2 id="referrals-invite-title">{invited ? 'Bạn được mời nhận 4 voucher' : 'Đăng nhập để lấy link mời'}</h2>
        <p>{invited ? 'Tạo tài khoản và xác nhận email, sau đó mở lại link này để nhận quà.' : 'Bạn cần tài khoản đã xác nhận email để tạo link mời.'}</p>
        <div className="referrals-actions">
          <Link className="btn btn-primary" to="/register" state={{ from: returnTo }}>Tạo tài khoản</Link>
          <Link className="btn btn-secondary" to="/login" state={{ from: returnTo }}>Đăng nhập</Link>
        </div>
      </> : null}

      {panel === 'setup' ? <>
        <h2 id="referrals-invite-title">Cần cập nhật hồ sơ</h2>
        <p>Lưu thông tin cơ bản trong hồ sơ trước khi tạo link mời hoặc nhận quà.</p>
        <div className="referrals-actions"><Link className="btn btn-primary" to={profileSetupUrl(returnTo)}>Cập nhật hồ sơ</Link></div>
      </> : null}

      {panel === 'error' ? <>
        <h2 id="referrals-invite-title">Chưa tải được thông tin mời bạn</h2>
        <p role="alert">{loadError}</p>
        <div className="referrals-actions"><button type="button" className="btn btn-secondary" onClick={() => { setLoadError(''); setAttempt(value => value + 1) }}>Thử lại</button></div>
      </> : null}

      {panel === 'create' ? <>
        <h2 id="referrals-invite-title">Tạo link mời</h2>
        <p>{campaignEnded ? 'Đợt này đã hết lượt nhận quà, nên link mời chưa mang lại voucher.' : 'Tạo link rồi gửi cho bạn bè. Khi bạn ấy nhận lời mời, cả hai đều có voucher.'}</p>
        <div className="referrals-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void act(false)}>{busy ? 'Đang tạo…' : 'Tạo link mời'}</button></div>
      </> : null}

      {panel === 'share' ? <>
        <h2 id="referrals-invite-title">Link mời của bạn</h2>
        {campaignEnded ? <p>Đợt này đã hết lượt nhận quà, nên link mời chưa mang lại voucher.</p> : null}
        <label htmlFor="referral-invite-link" className="referrals-visually-hidden">Link mời</label>
        <div className="referrals-copy-row">
          <input id="referral-invite-link" className="form-input referrals-input" value={inviteUrl} readOnly onFocus={event => event.target.select()} />
          <button type="button" className="btn btn-primary" onClick={() => void copy(inviteUrl, 'link')}>{copied === 'link' ? 'Đã sao chép' : 'Sao chép link'}</button>
        </div>
        <div className="referrals-share" aria-label="Cách gửi khác">
          {canShareNatively ? <button type="button" className="referrals-share__item" onClick={() => void navigator.share({ title: 'Mời bạn dùng Homeji', text: `Nhận lời mời của mình để cả hai có voucher Homeji, giảm đến ${GIFT_TOTAL}.`, url: inviteUrl }).catch(() => undefined)}>Chia sẻ</button> : null}
          <a className="referrals-share__item" href={`https://zalo.me/share?url=${encodeURIComponent(inviteUrl)}`} target="_blank" rel="noopener noreferrer">Zalo</a>
          <a className="referrals-share__item" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
          <button type="button" className="referrals-share__item" aria-expanded={showQr} onClick={() => setShowQr(value => !value)}>{showQr ? 'Ẩn mã QR' : 'Hiện mã QR'}</button>
        </div>
        {showQr ? <div className="referrals-qr">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}&margin=6`} alt="Mã QR của link mời" width="180" height="180" loading="lazy" />
          <p>Quét bằng camera điện thoại hoặc Zalo để mở link.</p>
        </div> : null}
        <div className="referrals-code">
          <span>Mã mời</span>
          <code>{data?.code}</code>
          <button type="button" className="referrals-link-button" onClick={() => void copy(data?.code ?? '', 'code')}>{copied === 'code' ? 'Đã sao chép' : 'Sao chép mã'}</button>
        </div>
      </> : null}
    </section>
  )

  return (
    <main className="referrals-page" data-glass-exclude>
      <section className="referrals-hero" aria-labelledby="referrals-title">
        <div className="referrals-hero__copy">
          <p className="referrals-hero__eyebrow">Quà mời bạn · Đợt 1</p>
          <h1 id="referrals-title">Có bạn, có nhà.<br /><span>Có cả quà nữa.</span></h1>
          <p className="referrals-hero__lead">Mời một người bạn đến Homeji. Cả hai cùng nhận 4 voucher, giảm tổng cộng đến <strong>{GIFT_TOTAL}</strong>.</p>
          {isAuthenticated
            ? <a className="referrals-hero__cta" href="#referrals-action">{claimFirst ? 'Nhận quà ngay' : 'Mời bạn ngay'}<span aria-hidden="true">→</span></a>
            : <Link className="referrals-hero__cta" to="/register" state={{ from: returnTo }}>Đăng ký nhận quà<span aria-hidden="true">→</span></Link>}
          <ul className="referrals-hero__facts">
            <li><strong>4</strong> voucher mỗi người</li>
            <li><strong>{MAX_INVITES}</strong> lần mời được thưởng</li>
            {data ? <li><strong>{data.remainingPairs}/{CAMPAIGN_PAIRS}</strong> lượt còn lại</li> : <li><strong>{CAMPAIGN_PAIRS}</strong> lượt trong đợt này</li>}
          </ul>
        </div>
        <div className="referrals-hero__art" aria-hidden="true">
          <div className="referrals-ticket referrals-ticket--food"><small>ĐỒ ĂN</small><strong>Giảm 5%</strong><span>3 voucher</span></div>
          <div className="referrals-ticket referrals-ticket--premium"><small>PREMIUM</small><strong>Giảm 20%</strong><span>1 voucher</span></div>
          <div className="referrals-ticket referrals-ticket--main">
            <small>GIẢM TỔNG CỘNG ĐẾN</small>
            <strong>{GIFT_TOTAL}</strong>
            <span>Cho cả bạn và người được mời</span>
          </div>
        </div>
      </section>

      <div className="referrals-feedback" aria-live="polite">
        {error ? <p className="referrals-message referrals-message--error" role="alert">{error}</p> : null}
        {notice ? <p className="referrals-message referrals-message--success" role="status">{notice}</p> : null}
      </div>

      <div className={`referrals-layout${showAside ? '' : ' referrals-layout--single'}`}>
        <div className="referrals-primary" id="referrals-action">{claimFirst ? claimForm : invitePanel}</div>

        {showAside && data ? <aside className="referrals-aside" aria-label="Tiến độ mời bạn">
          <section className="referrals-panel">
            <h2>Tiến độ</h2>
            <dl className="referrals-stats">
              <div><dt>Bạn đã mời</dt><dd>{Math.min(MAX_INVITES, data.successfulInvites)}/{MAX_INVITES}</dd></div>
              <div><dt>Lượt còn lại của đợt</dt><dd>{data.remainingPairs}/{CAMPAIGN_PAIRS}</dd></div>
            </dl>
            {data.received ? <p>Bạn đã nhận quà đăng ký.</p> : null}
          </section>
          {showClaim && !claimFirst ? claimForm : null}
        </aside> : null}

        <div className="referrals-rest">
          {claimFirst ? invitePanel : null}

          {isAuthenticated && !needsProfileSetup && data ? <section className="referrals-section" aria-labelledby="referrals-vouchers-title">
            <h2 id="referrals-vouchers-title">Voucher của bạn</h2>
            {vouchers.length ? <ul className="referrals-vouchers">{vouchers.map(group => <VoucherRow key={group.key} group={group} />)}</ul>
              : <p className="referrals-empty">Chưa có voucher. Voucher sẽ hiện ở đây khi có người nhận lời mời của bạn, hoặc khi bạn nhận quà bằng mã mời.</p>}
          </section> : null}

          <section className="referrals-section" aria-labelledby="referrals-steps-title">
            <h2 id="referrals-steps-title">Cách nhận quà</h2>
            <ol className="referrals-steps">
              <li><strong>Gửi link mời</strong><span>Gửi link hoặc mã mời cho bạn bè.</span></li>
              <li><strong>Bạn ấy tạo tài khoản</strong><span>Đăng ký, xác nhận email và lưu thông tin cơ bản.</span></li>
              <li><strong>Bạn ấy nhận quà</strong><span>Mở lại link trong 7 ngày kể từ khi đăng ký và bấm Nhận quà. Cả hai có voucher ngay.</span></li>
            </ol>
          </section>

          <section className="referrals-section" aria-labelledby="referrals-gifts-title">
            <h2 id="referrals-gifts-title">Mỗi người nhận được</h2>
            <ul className="referrals-gifts">
              <li>
                <strong>3 voucher đồ ăn</strong>
                <span>Giảm 5%, tối đa {formatPrice(10000)} mỗi đơn</span>
                <small>Đơn từ {formatPrice(100000)} ở mục Đồ ăn.</small>
              </li>
              <li>
                <strong>1 voucher gói Premium</strong>
                <span>Giảm 20%, tối đa {formatPrice(20000)}</span>
                <small>Gói từ {formatPrice(50000)}, thanh toán bằng Ví Homeji.</small>
              </li>
            </ul>
          </section>

          <section className="referrals-section" aria-labelledby="referrals-rules-title">
            <h2 id="referrals-rules-title">Thể lệ</h2>
            <ul className="referrals-rules">{RULES.map(rule => <li key={rule}>{rule}</li>)}</ul>
          </section>
        </div>
      </div>
    </main>
  )
}

const VOUCHER_STATE_LABEL = { used: 'Đã dùng', expired: 'Đã hết hạn' } as const

function VoucherRow({ group: { voucher, state, count } }: { group: VoucherGroup }) {
  const isFood = voucher.purpose === 'food'
  return (
    <li className={`referrals-voucher${state === 'usable' ? '' : ' is-inactive'}`}>
      <div className="referrals-voucher__rate">{Math.round(voucher.rate * 100)}%</div>
      <div className="referrals-voucher__body">
        <strong>{isFood ? 'Đồ ăn' : 'Gói Premium'}{count > 1 ? ` · ${count} voucher` : ''}</strong>
        <span>Tối đa {formatPrice(voucher.maximumDiscount)}, {isFood ? 'đơn' : 'gói'} từ {formatPrice(voucher.minimumSpend)}. Hạn {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}.</span>
      </div>
      {state === 'usable'
        ? <Link className="btn btn-secondary btn-sm referrals-voucher__action" to={isFood ? '/?section=marketplace&market=food' : '/?section=payments'}>{isFood ? 'Đặt món' : 'Xem gói'}</Link>
        : <span className="referrals-voucher__state">{VOUCHER_STATE_LABEL[state]}</span>}
    </li>
  )
}
