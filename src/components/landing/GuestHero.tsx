import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { navigateGuestLanding, searchGuestListings } from './guestLandingNav'
import { RevealText } from '../motion/RevealText'
import { HERO_IMAGE, HERO_SIZES, HERO_SRC_SET } from './heroImage'
import { HouseIcon, UsersIcon, ShieldCheckIcon } from '../icons/SvgIcons'
import './GuestHero.css'

const NAV_ITEMS = [
  { id: 'mission', label: 'Về Homeji' },
  { id: 'listings', label: 'Danh sách phòng' },
  { id: 'map', label: 'Bản đồ' },
  { id: 'how', label: 'Cách dùng' },
] as const

export function GuestHero() {
  const [keyword, setKeyword] = useState('')
  const hero = useRef<HTMLElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const glass = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('hj-no-scrollbar')
    return () => root.classList.remove('hj-no-scrollbar')
  }, [])
  useEffect(() => {
    const section = hero.current
    const photo = image.current
    const canvas = glass.current
    if (!section || !photo || !canvas) return
    const largeScreen = matchMedia('(min-width: 641px) and (forced-colors: none) and (prefers-reduced-transparency: no-preference)')
    let dispose: (() => void) | undefined
    let revision = 0
    const update = () => {
      const request = ++revision
      dispose?.()
      dispose = undefined
      if (!largeScreen.matches) return
      void import('./guestHeroGlass').then(({ attachGuestHeroGlass }) => {
        if (request === revision) dispose = attachGuestHeroGlass(section, photo, canvas)
      }).catch(() => { /* The original hero image is already visible. */ })
    }
    largeScreen.addEventListener('change', update)
    update()
    return () => {
      revision++
      largeScreen.removeEventListener('change', update)
      dispose?.()
    }
  }, [])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    searchGuestListings(keyword.trim())
  }

  return (
    <section ref={hero} className="guest-hero" id="hero" aria-label="Homeji - trang chủ">
      <div className="guest-hero__media" aria-hidden="true">
        <img ref={image} src={HERO_IMAGE} srcSet={HERO_SRC_SET} sizes={HERO_SIZES} alt="" className="guest-hero__bg-img" fetchPriority="high" />
        <canvas ref={glass} className="guest-hero__glass" hidden />
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

          <div className="guest-hero__top-actions">
            <Link to="/posts/new" className="guest-hero__top-post-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M12 5v14m-7-7h14"/></svg>
              Đăng tin
            </Link>
            <Link to="/login" className="guest-hero__top-login-link liquid-action">Đăng nhập</Link>
          </div>
        </header>

        <div className="guest-hero__center">
          <div className="guest-hero__slogan-wrap">
            <RevealText as="h1" className="guest-hero__hello" text={'Trọ an tâm.\nNâng tầm cuộc sống.'} delay={0.1} />
          </div>
          <p className="guest-hero__sub">Tìm phòng phù hợp. Gặp người cùng nhịp sống tại TP.HCM.</p>
          <form className="guest-hero__search" role="search" onSubmit={submit} data-glass-exclude>
            <label htmlFor="guest-hero-search">Bạn muốn ở khu vực nào?</label>
            <div>
              <input id="guest-hero-search" type="search" value={keyword} maxLength={150} autoComplete="off" enterKeyHint="search"
                placeholder="Tên đường, khu vực hoặc tiện ích" onChange={event => setKeyword(event.target.value)} />
              <button type="submit">Tìm phòng</button>
            </div>
          </form>
          <div className="guest-hero__proof-bar" aria-label="Bảo chứng và thống kê">
            <div className="guest-hero__proof-item">
              <span className="guest-hero__proof-icon" aria-hidden="true"><HouseIcon size={16} /></span>
              <span><strong>1.500+</strong> phòng trọ TP.HCM</span>
            </div>
            <div className="guest-hero__proof-item">
              <span className="guest-hero__proof-icon" aria-hidden="true"><UsersIcon size={16} /></span>
              <span><strong>800+</strong> bạn trẻ đã kết nối</span>
            </div>
            <div className="guest-hero__proof-item">
              <span className="guest-hero__proof-icon" aria-hidden="true"><ShieldCheckIcon size={16} /></span>
              <span>Xác minh chính chủ 100%</span>
            </div>
          </div>
          <p className="guest-hero__account">Muốn lưu phòng và xem số liên hệ? <Link to="/register">Tạo tài khoản miễn phí</Link></p>
        </div>
      </div>
    </section>
  )
}
