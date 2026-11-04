import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './GuestChrome.css'
import { GUEST_LANDING_NAV_EVENT, type GuestLandingNavDetail } from './guestLandingNav'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

/** Guests can follow room links: list and map views open the matching landing section. */
function initialSection(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash) return hash
  const params = new URLSearchParams(window.location.search)
  const section = params.get('section')
  if (section !== 'listings' && section !== 'explore') return null
  return params.get('view') === 'list' ? 'listings' : 'map'
}

export function GuestChrome() {
  const [ctaVisible, setCtaVisible] = useState(false)

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const id = (event as CustomEvent<GuestLandingNavDetail>).detail?.id
      if (id) scrollToSection(id)
    }
    window.addEventListener(GUEST_LANDING_NAV_EVENT, onNavigate)
    return () => window.removeEventListener(GUEST_LANDING_NAV_EVENT, onNavigate)
  }, [])

  useEffect(() => {
    const target = initialSection()
    if (!target) return undefined
    const timer = window.setTimeout(() => scrollToSection(target), 80)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return undefined
    const observer = new IntersectionObserver(([entry]) => setCtaVisible(!entry.isIntersecting))
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return <div className={`guest-fixed-cta${ctaVisible ? ' is-visible' : ''}`} hidden={!ctaVisible} data-glass-exclude>
    <span>Miễn phí đăng ký</span>
    <Link to="/register" className="guest-fixed-cta__go">Tạo tài khoản</Link>
  </div>
}
