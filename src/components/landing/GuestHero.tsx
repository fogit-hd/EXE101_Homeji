import { Link } from 'react-router-dom'
import { navigateGuestLanding } from './guestLandingNav'
import { SeamlessLoopVideo } from './SeamlessLoopVideo'
import './GuestHero.css'

export function GuestHero() {
  const goToMap = (e: React.MouseEvent) => {
    e.preventDefault()
    navigateGuestLanding('map')
  }

  return (
    <section className="guest-hero" id="hero" aria-label="Homeji — trang chủ">
      <div className="guest-hero__media" aria-hidden="true">
        <SeamlessLoopVideo className="guest-hero__video" />
        <div className="guest-hero__veil" />
        <div className="guest-hero__grain" />
      </div>

      <div className="guest-hero__frame">
        <div className="guest-hero__top">
          <img
            src="/brand/homeji-logo.png"
            alt=""
            className="guest-hero__corner-logo"
            width={48}
            height={48}
          />
          <p className="guest-hero__mark">Homeji</p>
        </div>

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

          <div className="guest-hero__rule" aria-hidden="true" />

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

        <div className="guest-hero__bottom">
          <div className="guest-hero__spine" aria-hidden="true" />
          <div className="guest-hero__reserve-wrap" id="hero-start-cta">
            <Link to="/register" className="guest-hero__reserve">
              Bắt đầu ngay
            </Link>
          </div>
          <Link to="/login" className="guest-hero__login-link">
            Đã có tài khoản? Đăng nhập
          </Link>
        </div>
      </div>
    </section>
  )
}
