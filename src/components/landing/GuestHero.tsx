import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { navigateGuestLanding, searchGuestListings } from './guestLandingNav'
import { RevealText } from '../motion/RevealText'
import { HERO_IMAGE, HERO_SIZES, HERO_SRC_SET } from './heroImage'
import './GuestHero.css'

const NAV_ITEMS = [
  { id: 'mission', label: 'Về Homeji' },
  { id: 'listings', label: 'Danh sách phòng' },
  { id: 'map', label: 'Bản đồ' },
  { id: 'how', label: 'Cách dùng' },
] as const

export function GuestHero() {
  const [keyword, setKeyword] = useState('')
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('hj-no-scrollbar')
    return () => root.classList.remove('hj-no-scrollbar')
  }, [])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    searchGuestListings(keyword.trim())
  }

  return (
    <section className="guest-hero" id="hero" aria-label="Homeji — trang chủ">
      <div className="guest-hero__media" aria-hidden="true">
        <img src={HERO_IMAGE} srcSet={HERO_SRC_SET} sizes={HERO_SIZES} alt="" className="guest-hero__bg-img" fetchPriority="high" />
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

          <Link to="/login" className="guest-hero__top-login-link liquid-action">Đăng nhập</Link>
        </header>

        <div className="guest-hero__center">
          <div className="guest-hero__slogan-wrap">
            <RevealText as="h1" className="guest-hero__hello" text={'Trọ an tâm.\nNâng tầm cuộc sống.'} delay={0.1} />
          </div>
          <p className="guest-hero__sub">Tìm phòng phù hợp. Gặp người cùng nhịp sống.</p>
          <form className="guest-hero__search" role="search" onSubmit={submit} data-glass-exclude>
            <label htmlFor="guest-hero-search">Bạn muốn ở khu vực nào?</label>
            <div>
              <input id="guest-hero-search" type="search" value={keyword} maxLength={150} autoComplete="off" enterKeyHint="search"
                placeholder="Tên đường, khu vực hoặc tiện ích" onChange={event => setKeyword(event.target.value)} />
              <button type="submit">Tìm phòng</button>
            </div>
          </form>
          <p className="guest-hero__account">Muốn lưu phòng và xem số liên hệ? <Link to="/register">Tạo tài khoản miễn phí</Link></p>
        </div>
      </div>
    </section>
  )
}
