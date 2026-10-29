import { useEffect, useState, useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { claimReferral, createReferralCode, getReferrals, type ReferralSummary, type Voucher } from '../api/referrals'
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
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const codeInputId = useId()

  useEffect(() => {
    let active = true
    if (isAuthenticated) {
      void getReferrals()
        .then(result => {
          if (active) setData(result)
        })
        .catch(reason => {
          if (active) setError(getErrorMessage(reason))
        })
    }
    return () => {
      active = false
    }
  }, [isAuthenticated])

  const act = async (claim: boolean) => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await (claim ? claimReferral(code.trim()) : createReferralCode())
      setData(result)
      setNotice(
        claim
          ? 'Quà đã có trong tài khoản của cả hai. Xem voucher bên dưới.'
          : 'Mã mời đã sẵn sàng. Sao chép link và gửi cho bạn bè.'
      )
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      if (type === 'code') {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2400)
        setNotice('Đã sao chép mã giới thiệu vào bộ nhớ tạm.')
      } else {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2400)
        setNotice('Đã sao chép link mời vào bộ nhớ tạm.')
      }
      setError('')
    } catch {
      setError('Chưa sao chép được. Bạn có thể chọn và sao chép thủ công ở ô bên cạnh.')
    }
  }

  const handleNativeShare = async () => {
    if (!inviteUrl) return
    if (navigator?.share) {
      try {
        await navigator.share({
          title: 'Homeji — Nhận bộ 4 voucher 50.000đ',
          text: 'Nhận ngay bộ 4 voucher giảm giá ẩm thực và hội viên VIP trên Homeji cùng mình nhé!',
          url: inviteUrl,
        })
      } catch {
        // user cancelled share
      }
    } else {
      await copyToClipboard(inviteUrl, 'link')
    }
  }

  const returnTo = '/referrals' + (code ? '?code=' + encodeURIComponent(code) : '')
  const inviteUrl = data?.code ? window.location.origin + '/referrals?code=' + data.code : ''
  const remainingPairs = data?.remainingPairs
  const successfulInvites = data?.successfulInvites
  const campaignBudgetMax = 1000000

  return (
    <main className="referrals-page" data-glass-exclude>
      {/* Background optical gradient lights */}
      <div className="referrals-bg-glow referrals-bg-glow--top" aria-hidden="true" />
      <div className="referrals-bg-glow referrals-bg-glow--bottom" aria-hidden="true" />

      {/* Header bar */}
      <header className="referrals-header">
        <Link to="/" className="referrals-back-btn">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          <span>Trang chủ Bản đồ</span>
        </Link>
        <div className="referrals-badge">
          <span className="referrals-badge__pulse" aria-hidden="true" />
          <span>Chiến dịch Thưởng Bạn Mới · Đợt 1</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="referrals-hero">
        <div className="referrals-hero__intro">
        <div className="referrals-hero__pill">
          <span>MỜI BẠN ĐẾN HOMEJI</span>
        </div>
        <h1 className="referrals-hero__title">
          Có bạn, có nhà.<br /><span>Có cả quà nữa.</span>
        </h1>
        <p className="referrals-hero__desc">
          Mỗi người nhận trọn bộ <strong>4 voucher</strong> giúp tiết kiệm lên đến{' '}
          <strong className="referrals-hero__highlight">50.000đ</strong>. Quà được cấp ngay vào tài khoản sau khi
          bạn mới xác nhận email và nhận lời mời.
        </p>
        <a className="referrals-hero__cta" href="#invite-center">Mời bạn cùng nhận quà <span aria-hidden="true">↗</span></a>
        </div>
        <div className="referrals-hero__art" aria-label="Mỗi người nhận 4 voucher, giảm lên đến 50.000 đồng">
          <div className="referrals-hero__orbit" aria-hidden="true" />
          <div className="referrals-hero__ticket referrals-hero__ticket--back" aria-hidden="true"><span>HOMEJI · QUÀ CHO BẠN MỚI</span><strong>Chia sẻ niềm vui</strong><span>Mời một người bạn, nhận thêm một niềm vui.</span></div>
          <div className="referrals-hero__ticket referrals-hero__ticket--front" aria-hidden="true">
            <div className="referrals-hero__ticket-top"><span>HOMEJI REWARDS</span><span>↗</span></div>
            <span className="referrals-hero__ticket-label">GIẢM LÊN ĐẾN</span>
            <strong>50.000<span>đ</span></strong>
            <div className="referrals-hero__ticket-bottom"><span>03 voucher ẩm thực<br />01 voucher VIP</span><span className="referrals-hero__ticket-seal">Cho<br />cả hai</span></div>
          </div>
          <span className="referrals-hero__art-caption">Một lời mời. Hai phần quà.</span>
        </div>
      </section>

        {/* Live HUD Cards */}
        <div className="referrals-hud">
          <div className="referrals-hud__card">
            <div className="referrals-hud__info">
              <span className="referrals-hud__label">Lượt nhận quà còn lại</span>
              <strong className="referrals-hud__value" role="status">
                {remainingPairs ?? '—'} <span className="referrals-hud__unit">/ 10 suất</span>
              </strong>
            </div>
            <div className="referrals-hud__progress-track" aria-hidden="true">
              <div
                className="referrals-hud__progress-fill"
                style={{ width: `${remainingPairs == null ? 0 : Math.max(0, Math.min(100, (remainingPairs / 10) * 100))}%` }}
              />
            </div>
          </div>

          <div className="referrals-hud__card">
            <div className="referrals-hud__info">
              <span className="referrals-hud__label">Bạn đã mời thành công</span>
              <strong className="referrals-hud__value">
                {successfulInvites ?? '—'} <span className="referrals-hud__unit">/ 5 bạn tối đa</span>
              </strong>
            </div>
            <div className="referrals-hud__meta">
              {successfulInvites == null ? 'Đăng nhập để xem lượt mời' : `Đã mời ${Math.min(5, successfulInvites)}/5 bạn`}
            </div>
          </div>

          <div className="referrals-hud__card">
            <div className="referrals-hud__info">
              <span className="referrals-hud__label">Quà tặng mỗi người</span>
              <strong className="referrals-hud__value referrals-hud__value--green">
                50.000đ <span className="referrals-hud__unit">(4 voucher)</span>
              </strong>
            </div>
            <div className="referrals-hud__meta">
              Ngân sách đợt: {formatPrice(campaignBudgetMax)}
            </div>
          </div>
        </div>

      {/* Alerts */}
      {error && (
        <div className="referral-alert referral-alert--error" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="referral-error">{error}</span>
        </div>
      )}
      {notice && (
        <div className="referral-alert referral-alert--success" role="status">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span>{notice}</span>
        </div>
      )}

      {/* Main Interactive Grid */}
      <div className="referrals-grid" id="invite-center">
        {/* Card 1: Invite Center */}
        <section className="referrals-card referrals-card--share">
          <div className="referrals-card__header">
            <div>
              <h2 className="referrals-card__title">Link mời của bạn</h2>
              <p className="referrals-card__subtitle">
                Gửi mã hoặc link cho bạn bè để cùng nhận bộ 4 voucher ngay khi đăng ký.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="referrals-loading" role="status">
              <span className="referrals-loading__spinner" aria-hidden="true" />
              <span>Đang kiểm tra tài khoản…</span>
            </div>
          ) : !isAuthenticated ? (
            <div className="referrals-unauth-box">
              <div className="referrals-unauth-benefits">
                <div className="referrals-unauth-item">
                  <span className="referrals-check-mark">✓</span>
                  <span>Nhận ngay 4 voucher ẩm thực & VIP</span>
                </div>
                <div className="referrals-unauth-item">
                  <span className="referrals-check-mark">✓</span>
                  <span>Tạo link mời riêng chia sẻ không giới hạn</span>
                </div>
                <div className="referrals-unauth-item">
                  <span className="referrals-check-mark">✓</span>
                  <span>Miễn phí 100%, không yêu cầu nạp tiền</span>
                </div>
              </div>
              <div className="referral-actions">
                <Link className="btn btn-primary referrals-btn-cta" to="/register" state={{ from: returnTo }}>
                  Đăng ký để nhận quà
                </Link>
                <Link className="btn btn-secondary" to="/login" state={{ from: returnTo }}>
                  Đã có tài khoản? Đăng nhập
                </Link>
              </div>
            </div>
          ) : needsProfileSetup ? (
            <div className="referrals-setup-box">
              <p className="referrals-setup-desc">
                Bạn cần lưu Thông tin cơ bản trước khi tạo mã mời hoặc nhận quà.
              </p>
              <Link className="btn btn-primary" to={profileSetupUrl(returnTo)}>
                Lưu Thông tin cơ bản trước
              </Link>
            </div>
          ) : inviteUrl ? (
            <div className="referrals-share-content">
              {/* Monospace Code Display */}
              <div className="referrals-code-panel">
                <span className="referrals-code-label">MÃ GIỚI THIỆU CỦA BẠN</span>
                <div className="referrals-code-row">
                  <code className="referrals-code-text">{data?.code}</code>
                  <button
                    type="button"
                    className="referrals-icon-copy-btn"
                    disabled={busy}
                    aria-label="Sao chép mã"
                    onClick={() => void copyToClipboard(data?.code || '', 'code')}
                  >
                    {copiedCode ? (
                      <span className="referrals-copied-tag">Đã chép! ✓</span>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                          <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12a1.5 1.5 0 0 1 .439 1.061V16.5A1.5 1.5 0 0 1 15.5 18h-7A1.5 1.5 0 0 1 7 16.5v-13Z" />
                          <path d="M5 5.5A1.5 1.5 0 0 0 3.5 7v10.5A1.5 1.5 0 0 0 5 19h7a1.5 1.5 0 0 0 1.5-1.5v-.5H7.5A2.5 2.5 0 0 1 5 14.5V5.5Z" />
                        </svg>
                        <span>Sao chép mã</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Full link input */}
              <div className="referrals-link-box">
                <label className="referrals-input-label" htmlFor="referral-invite-link">
                  Đường dẫn mời trực tiếp
                </label>
                <div className="referrals-link-row">
                  <input
                    id="referral-invite-link"
                    className="form-input referrals-link-input"
                    aria-label="Link mời của bạn"
                    value={inviteUrl}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-secondary referrals-copy-btn"
                    disabled={busy}
                    onClick={() => void copyToClipboard(inviteUrl, 'link')}
                  >
                    {copiedLink ? 'Đã sao chép ✓' : 'Sao chép link'}
                  </button>
                </div>
              </div>

              {/* Share shortcuts */}
              <div className="referrals-share-actions">
                <button
                  type="button"
                  className="referrals-share-chip referrals-share-chip--native"
                  onClick={() => void handleNativeShare()}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                    <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" />
                  </svg>
                  <span>Chia sẻ</span>
                </button>

                <a
                  href={`https://zalo.me/share?url=${encodeURIComponent(inviteUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="referrals-share-chip"
                >
                  <span>Zalo</span>
                </a>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="referrals-share-chip"
                >
                  <span>Facebook</span>
                </a>

                <button
                  type="button"
                  className="referrals-share-chip"
                  onClick={() => setShowQr(prev => !prev)}
                >
                  <span>{showQr ? 'Ẩn mã QR' : 'Hiện mã QR'}</span>
                </button>
              </div>

              {/* QR Code Popover */}
              {showQr && (
                <div className="referrals-qr-box">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      inviteUrl
                    )}&margin=6`}
                    alt="Mã QR liên kết giới thiệu"
                    width="180"
                    height="180"
                    className="referrals-qr-img"
                    loading="lazy"
                  />
                  <p className="referrals-qr-hint">
                    Quét bằng camera điện thoại hoặc ứng dụng Zalo để mở link ngay.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="referrals-create-box">
              <p className="referrals-create-desc">
                Bạn chưa có mã mời. Nhấn nút bên dưới để tạo mã giới thiệu độc quyền của bạn ngay bây giờ.
              </p>
              <button
                type="button"
                className="btn btn-primary referrals-btn-cta"
                disabled={busy}
                onClick={() => void act(false)}
              >
                {busy ? 'Đang tạo mã…' : 'Tạo link mời'}
              </button>
            </div>
          )}
        </section>

        {/* Card 2: Claim Code */}
        <form
          className="referrals-card referrals-card--claim"
          onSubmit={e => {
            e.preventDefault()
            void act(true)
          }}
        >
          <div className="referrals-card__header">
            <div>
              <h2 className="referrals-card__title">Bạn có mã mời?</h2>
              <p className="referrals-card__subtitle">
                Nhập mã bạn bè gửi để nhận 4 voucher.
              </p>
            </div>
          </div>

          <div className="referrals-claim-body">
            <label htmlFor={codeInputId} className="referrals-input-label">
              Mã do bạn bè gửi (24 ký tự)
            </label>
            <input
              id={codeInputId}
              className="form-input referrals-code-input"
              value={code}
              maxLength={24}
              required
              pattern="[A-Fa-f0-9]{24}"
              placeholder="Nhập hoặc dán mã 24 ký tự..."
              onChange={e => setCode(e.target.value)}
            />
            <p className="referrals-claim-subhint">
              {data?.received
                ? 'Bạn đã nhận quà từ chương trình này. Hãy chia sẻ link của mình để nhận thêm lượt quà!'
                : 'Lưu ý: Mở và nhận quà trong 7 ngày từ khi đăng ký tài khoản.'}
            </p>

            <button
              type="submit"
              className="btn btn-primary referrals-btn-cta"
              disabled={busy || data?.received || data?.remainingPairs === 0}
            >
              {data?.received ? '✓ Bạn đã nhận quà' : busy ? 'Đang nhận quà…' : 'Nhận quà cho cả hai'}
            </button>
          </div>
        </form>
      </div>

      {/* 3 Steps Guide */}
      <section className="referrals-section referrals-steps-section">
        <div className="referrals-section-header">
          <span className="referrals-section-pill">QUY TRÌNH ĐƠN GIẢN</span>
          <h2 className="referrals-section-title">3 bước nhận quà cho cả hai</h2>
          <p className="referrals-section-subtitle">
            Chỉ mất 2 phút để hoàn tất và nhận voucher tiết kiệm chi phí phòng trọ, ẩm thực.
          </p>
        </div>

        <ol className="referrals-steps-list">
          <li className="referrals-step-card">
            <div className="referrals-step-number">01</div>
            <div className="referrals-step-content">
              <h3 className="referrals-step-title">Gửi link mời</h3>
              <p className="referrals-step-text">
                Sao chép link mời hoặc gửi mã 24 ký tự cho bạn bè qua Zalo, Messenger hoặc gặp mặt trực tiếp.
              </p>
            </div>
          </li>

          <li className="referrals-step-card">
            <div className="referrals-step-number">02</div>
            <div className="referrals-step-content">
              <h3 className="referrals-step-title">Bạn mới đăng ký & xác nhận</h3>
              <p className="referrals-step-text">
                Bạn bè đăng ký tài khoản mới, xác nhận địa chỉ email và lưu Thông tin cơ bản trên Homeji.
              </p>
            </div>
          </li>

          <li className="referrals-step-card">
            <div className="referrals-step-number">03</div>
            <div className="referrals-step-content">
              <h3 className="referrals-step-title">Nhận quà cho cả hai</h3>
              <p className="referrals-step-text">
                Mở lại link trong 7 ngày từ khi đăng ký, bấm Nhận quà cho cả hai để nhận ngay 4 voucher vào ví.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Rewards Breakdown Showcase */}
      <section className="referrals-section referrals-rewards-section">
        <div className="referrals-section-header">
          <span className="referrals-section-pill">CHI TIẾT ƯU ĐÃI</span>
          <h2 className="referrals-section-title">Quà của mỗi người</h2>
          <p className="referrals-section-subtitle">
            Mỗi người nhận 3 voucher đặt đồ ăn và 1 voucher mua gói VIP trên Homeji.
          </p>
        </div>

        <div className="referrals-rewards-grid">
          <div className="referrals-reward-card referrals-reward-card--food">
            <div className="referrals-reward-header">
              <div className="referrals-reward-tag">ẨM THỰC QUANH NHÀ</div>
              <span className="referrals-reward-badge">3 VOUCHER</span>
            </div>
            <div className="referrals-reward-body">
              <div className="referrals-reward-highlight">Giảm 5%, lên đến 10.000đ</div>
              <p className="referrals-reward-rule">
                Áp dụng cho đơn hàng đồ ăn từ <strong>100.000đ</strong> tại Chợ đồ ăn sinh viên Homeji.
              </p>
              <ul className="referrals-reward-features">
                <li>Dùng cho 3 đơn đồ ăn khác nhau</li>
                <li>Thanh toán trực tiếp nhanh gọn qua giỏ hàng</li>
                <li>Đơn hủy được hoàn trả voucher tự động</li>
              </ul>
            </div>
          </div>

          <div className="referrals-reward-card referrals-reward-card--vip">
            <div className="referrals-reward-header">
              <div className="referrals-reward-tag">ĐẶC QUYỀN HỘI VIÊN</div>
              <span className="referrals-reward-badge">1 VOUCHER</span>
            </div>
            <div className="referrals-reward-body">
              <div className="referrals-reward-highlight">Giảm 20%, lên đến 20.000đ</div>
              <p className="referrals-reward-rule">
                Áp dụng cho gói hội viên VIP từ <strong>50.000đ</strong>, thanh toán bằng Ví Homeji.
              </p>
              <ul className="referrals-reward-features">
                <li>Gia tăng hiển thị tin đăng tìm bạn ở ghép / phòng trọ</li>
                <li>Huy hiệu thành viên uy tín trên toàn bộ bản đồ</li>
                <li>Ưu tiên nhận thông báo phòng trọ giá tốt mới nhất</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="referrals-notice-bar">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Hạn 30 ngày từ lúc nhận. Mỗi lần thanh toán dùng 1 voucher. Voucher không cộng vào số dư, không rút hoặc
            đổi thành tiền. Đơn đồ ăn bị hủy được trả lại voucher với hạn dùng ban đầu.
          </span>
        </div>
      </section>

      {/* User Vouchers Section */}
      <section className="referrals-section referrals-vouchers-section">
        <div className="referrals-section-header">
          <span className="referrals-section-pill">KHO QUÀ CỦA BẠN</span>
          <h2 className="referrals-section-title">
            Voucher của bạn{' '}
            {data?.vouchers && data.vouchers.length > 0 && (
              <span className="referrals-count-pill">{data.vouchers.length}</span>
            )}
          </h2>
        </div>

        {!data?.vouchers.length ? (
          <div className="referrals-empty-vouchers">
            <h3 className="referrals-empty-title">Chưa có voucher trong ví</h3>
            <p className="referrals-empty-desc">
              Quà sẽ xuất hiện tại đây ngay khi bạn nhận lời mời hợp lệ hoặc bạn bè dùng mã mời của bạn để nhận quà.
            </p>
          </div>
        ) : (
          <ul className="referral-vouchers">
            {data.vouchers.map(v => (
              <VoucherTicket key={v.id} voucher={v} now={now} />
            ))}
          </ul>
        )}
      </section>

      {/* FAQ & Terms */}
      <section className="referrals-section referrals-faq-section">
        <div className="referrals-section-header">
          <span className="referrals-section-pill">MINH BẠCH & THỂ LỆ</span>
          <h2 className="referrals-section-title">Câu hỏi thường gặp & Quy định</h2>
        </div>

        <div className="referrals-faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div key={idx} className={`referrals-faq-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="referrals-faq-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <span className="referrals-faq-question">{faq.question}</span>
                  <span className="referrals-faq-icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="referrals-faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="referrals-terms-box">
          <h3>Quy định chiến dịch</h3>
          <p>
            Đợt này có <strong>10 lượt mời nhận quà</strong>, ngân sách tối đa <strong>1.000.000đ</strong>. Mỗi người mời
            nhận thưởng tối đa <strong>5 lượt</strong>; mỗi tài khoản mới chỉ nhận quà đăng ký một lần. Tài khoản đã
            nhận thưởng khi mời người khác không thể nhận thêm quà đăng ký bằng mã khác.
          </p>
        </div>
      </section>
    </main>
  )
}

function VoucherTicket({ voucher: v, now }: { voucher: Voucher; now: number }) {
  const isExpired = Date.parse(v.expiresAt) <= now
  const isFood = v.purpose === 'food'

  return (
    <li className={`referral-ticket ${v.used ? 'is-used' : isExpired ? 'is-expired' : 'is-active'}`}>
      <div className={`referral-ticket__stub ${isFood ? 'referral-ticket__stub--food' : 'referral-ticket__stub--vip'}`}>
        <span className="referral-ticket__rate">GIẢM {Math.round(v.rate * 100)}%</span>
        <span className="referral-ticket__purpose">{isFood ? 'Đồ ăn' : 'Gói VIP'}</span>
      </div>

      <div className="referral-ticket__divider" aria-hidden="true">
        <div className="referral-ticket__notch referral-ticket__notch--top" />
        <div className="referral-ticket__dash" />
        <div className="referral-ticket__notch referral-ticket__notch--bottom" />
      </div>

      <div className="referral-ticket__main">
        <div className="referral-ticket__header">
          <strong className="referral-ticket__headline">
            {isFood ? 'Đồ ăn' : 'VIP'} · giảm {Math.round(v.rate * 100)}%, lên đến {formatPrice(v.maximumDiscount)}
          </strong>
          {v.used ? (
            <span className="referral-status-tag referral-status-tag--used">Đã dùng</span>
          ) : isExpired ? (
            <span className="referral-status-tag referral-status-tag--expired">Đã hết hạn</span>
          ) : (
            <span className="referral-status-tag referral-status-tag--valid">Có thể dùng</span>
          )}
        </div>

        <p className="referral-ticket__details">
          Đơn từ {formatPrice(v.minimumSpend)} · Hạn {new Date(v.expiresAt).toLocaleString('vi-VN')}
        </p>

        <div className="referral-ticket__footer">
          {v.used ? (
            <span className="referral-ticket__state-msg">Voucher đã được áp dụng cho đơn hàng</span>
          ) : isExpired ? (
            <span className="referral-ticket__state-msg">Voucher đã hết thời hạn 30 ngày</span>
          ) : (
            <Link
              to={isFood ? '/?section=marketplace&market=food' : '/?section=payments'}
              className="referral-ticket__cta-link"
            >
              Dùng voucher →
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

const FAQS = [
  {
    question: 'Ai có thể tham gia chương trình này?',
    answer:
      'Tất cả thành viên Homeji đều có thể tạo mã mời bạn bè. Người được mời cần là tài khoản mới, xác nhận email và lưu Thông tin cơ bản.',
  },
  {
    question: 'Thời hạn sử dụng của các voucher là bao lâu?',
    answer:
      'Tất cả 4 voucher có thời hạn sử dụng 30 ngày kể từ thời điểm nhận thưởng. Sau thời gian này, voucher chưa dùng sẽ tự động hết hạn.',
  },
  {
    question: 'Nếu đơn đồ ăn bị hủy thì voucher có được hoàn lại không?',
    answer:
      'Có. Đơn đồ ăn bị hủy hoặc không thành công sẽ được hoàn lại voucher vào ví của bạn với thời hạn sử dụng ban đầu.',
  },
  {
    question: 'Có thể quy đổi voucher ra tiền mặt hoặc chuyển cho người khác không?',
    answer:
      'Không. Voucher là ưu đãi giảm giá trực tiếp khi thanh toán dịch vụ hoặc đồ ăn trên Homeji, không được cộng dồn vào số dư ví và không quy đổi thành tiền mặt.',
  },
  {
    question: 'Giới hạn số lần nhận thưởng của mỗi tài khoản là bao nhiêu?',
    answer:
      'Mỗi người mời được nhận thưởng tối đa 5 lượt bạn mới thành công (tương ứng tối đa 20 voucher). Mỗi tài khoản mới chỉ nhận quà đăng ký 1 lần.',
  },
]
