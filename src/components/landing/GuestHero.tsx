import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { navigateGuestLanding } from './guestLandingNav'
import { RevealText } from '../motion/RevealText'
import './GuestHero.css'

const NAV_ITEMS = [
  { id: 'mission', label: 'Về Homeji' },
  { id: 'how', label: 'Cách hoạt động' },
  { id: 'map', label: 'Bản đồ' },
] as const

export function GuestHero() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('hj-no-scrollbar')
    return () => root.classList.remove('hj-no-scrollbar')
  }, [])

  return (
    <section className="guest-hero" id="hero" aria-label="Homeji — trang chủ">
      <div className="guest-hero__media" aria-hidden="true">
        <img src="/landing/bloom-hero-bg.png" alt="" className="guest-hero__bg-img" fetchPriority="high" />
        <div className="guest-hero__veil" />
      </div>

      <div className="guest-hero__frame">
        <header className="guest-hero__top">
          <a className="guest-hero__brand" href="#hero" aria-label="Homeji — Trang chủ"
            onClick={event => { event.preventDefault(); navigateGuestLanding('hero') }}>
            <img src="/brand/homeji-logo2.png" alt="" className="guest-hero__corner-logo" width={34} height={34} />
            <span className="guest-hero__brand-name">Homeji</span>
          </a>

          <nav className="guest-hero__nav" aria-label="Điều hướng trang chủ">
            {NAV_ITEMS.map(item => (
              <a key={item.id} href={`#${item.id}`} className={`guest-hero__nav-link${item.id === 'map' ? ' guest-hero__nav-link--map' : ''}`}
                onClick={event => { event.preventDefault(); navigateGuestLanding(item.id) }}>
                {item.label}
              </a>
            ))}
          </nav>

          <Link to="/login" className="guest-hero__top-login-link liquid-action">
            Đăng nhập
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
              <path d="M4 10h12m-5-5 5 5-5 5" />
            </svg>
          </Link>
        </header>

        <div className="guest-hero__center">
          <div className="guest-hero__slogan-wrap">
            <RevealText as="h1" className="guest-hero__hello" text={'Trọ an tâm.\nNâng tầm cuộc sống.'} delay={0.1} />
          </div>
          <p className="guest-hero__sub">Tìm phòng phù hợp. Gặp người cùng nhịp sống.</p>
          <div className="guest-hero__primary-wrap" id="hero-start-cta">
            <Link to="/register" className="guest-hero__primary liquid-action">
              <span>Bắt đầu ngay</span>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
