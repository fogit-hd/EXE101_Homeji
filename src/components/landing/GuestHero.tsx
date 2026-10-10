import { Link } from 'react-router-dom'
import { navigateGuestLanding } from './guestLandingNav'
import './GuestHero.css'

const NAV_ITEMS = [
  { id: 'mission', label: 'Sứ mệnh', hasArrow: true },
  { id: 'journey', label: 'Hành trình', hasArrow: true },
  { id: 'how', label: 'Cơ chế', hasArrow: true },
  { id: 'start', label: 'Cam kết', hasArrow: false },
  { id: 'map', label: 'Bản đồ', hasArrow: false },
] as const

export function GuestHero() {
  const goToMap = (e: React.MouseEvent) => {
    e.preventDefault()
    navigateGuestLanding('map')
  }

  const onNav = (id: string) => {
    navigateGuestLanding(id)
  }

  return (
    <section className="guest-hero" id="hero" aria-label="Homeji — trang chủ">
      <div className="guest-hero__media" aria-hidden="true">
        <img
          src="/landing/bloom-hero-bg.jpg"
          alt=""
          className="guest-hero__bg-img"
        />
        <div className="guest-hero__veil" />
        <div className="guest-hero__grain" />
      </div>

      <div className="guest-hero__frame">
        {/* Top horizontal navbar matching Bloom */}
        <header className="guest-hero__top">
          <div className="guest-hero__brand">
            <img
              src="/brand/homeji-logo.png"
              alt=""
              className="guest-hero__corner-logo"
              width={38}
              height={38}
            />
            <span className="guest-hero__brand-name">Homeji</span>
          </div>

          <nav className="guest-hero__nav" aria-label="Điều hướng trang chủ">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="guest-hero__nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  onNav(item.id)
                }}
              >
                <span>{item.label}</span>
                {item.hasArrow && <span className="guest-hero__nav-caret">▾</span>}
              </a>
            ))}
          </nav>

          <div className="guest-hero__top-actions">
            <Link to="/login" className="guest-hero__top-login-link">
              Đăng nhập
            </Link>
            <Link to="/register" className="guest-hero__top-consult-btn">
              Bắt đầu ngay
            </Link>
          </div>
        </header>

        {/* Center hero content */}
        <div className="guest-hero__center">
          <div className="guest-hero__slogan-wrap">
            <h1 className="guest-hero__hello">
              Trọ an tâm
              <br />
              Nâng tầm cuộc sống
            </h1>
          </div>
          <p className="guest-hero__sub">
            Nền tảng tìm phòng trọ &amp; bạn ở ghép an toàn
          </p>

          {/* Signature Bloom Pill CTA Button */}
          <div className="guest-hero__bloom-cta-wrap" id="hero-start-cta">
            <Link to="/register" className="guest-hero__bloom-cta">
              <span className="guest-hero__bloom-badge" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4.5 10h11m-4.5-4.5 4.5 4.5-4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="guest-hero__bloom-text">Bắt đầu ngay</span>
            </Link>
          </div>

          {/* Refined Glassmorphism Meta Cards */}
          <div className="guest-hero__meta">
            <a
              href="#map"
              className="guest-hero__meta-card guest-hero__meta-card--action"
              aria-label="Mở bản đồ phòng quanh Thủ Đức và Quận 9"
              onClick={goToMap}
            >
              <span className="guest-hero__explore-icon" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none">
                  <circle className="guest-hero__explore-ring" cx="20" cy="20" r="15.5" />
                  <path
                    className="guest-hero__explore-pin"
                    d="M20 9.2c-4.1 0-7.4 3.2-7.4 7.2 0 5.1 6.2 12.6 7 13.5a.6.6 0 0 0 .9 0c.8-.9 7-8.4 7-13.5 0-4-3.3-7.2-7.5-7.2Zm0 10.2a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="guest-hero__explore-copy">
                <span className="guest-hero__explore-eyebrow">Khám phá khu vực</span>
                <span className="guest-hero__explore-place">Thủ Đức &amp; Q.9</span>
                <span className="guest-hero__explore-action">Nhấn để mở bản đồ</span>
              </span>
              <span className="guest-hero__explore-go" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <path
                    d="M7.5 4.5 13 10l-5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </a>

            <div
              className="guest-hero__meta-card guest-hero__meta-card--info"
              aria-label="Dành cho sinh viên và chủ nhà"
            >
              <span className="guest-hero__audience-icon" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="15.5" stroke="currentColor" strokeOpacity="0.35" />
                  <path
                    fill="currentColor"
                    d="M20 12.2a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Zm-6.2 3.1a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Zm12.4 0a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4ZM9.8 27.2c0-2.6 2.9-4.4 6.4-4.4.7 0 1.4.08 2 .22A5.5 5.5 0 0 0 16.6 26c0 .4.04.8.1 1.2H9.8Zm20.4 0h-6.9c.06-.4.1-.8.1-1.2a5.5 5.5 0 0 0-1.6-2.98c.6-.14 1.3-.22 2-.22 3.5 0 6.4 1.8 6.4 4.4Zm-10.2 0c0-2.3 2.4-3.9 5.2-3.9s5.2 1.6 5.2 3.9v.1h-10.4v-.1Z"
                  />
                </svg>
              </span>
              <span className="guest-hero__explore-copy">
                <span className="guest-hero__explore-eyebrow">Dành cho</span>
                <span className="guest-hero__explore-place">Sinh viên &amp; chủ nhà</span>
              </span>
              <span className="guest-hero__explore-go guest-hero__explore-go--static" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Bottom subtle link */}
        <div className="guest-hero__bottom">
          <Link to="/login" className="guest-hero__login-link">
            Đã có tài khoản? <strong>Đăng nhập</strong>
          </Link>
        </div>
      </div>
    </section>
  )
}

