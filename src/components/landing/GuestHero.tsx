import { Link } from 'react-router-dom'
import { SeamlessLoopVideo } from './SeamlessLoopVideo'
import './GuestHero.css'

export function GuestHero() {
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
          <span className="guest-hero__top-balance" aria-hidden="true" />
        </div>

        <div className="guest-hero__center">
          <h1 className="guest-hero__hello">
            Xin chào,
            <span>bạn iu của mình</span>
          </h1>

          <div className="guest-hero__rule" aria-hidden="true" />

          <div className="guest-hero__meta">
            <div className="guest-hero__meta-col">
              <span className="guest-hero__meta-label">Khu vực</span>
              <span className="guest-hero__meta-value">Thủ Đức &amp; Q.9</span>
            </div>
            <div className="guest-hero__meta-col">
              <span className="guest-hero__meta-label">Dành cho</span>
              <span className="guest-hero__meta-value">Sinh viên &amp; chủ nhà</span>
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
