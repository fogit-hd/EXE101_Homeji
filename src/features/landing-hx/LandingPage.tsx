import { useCallback, useEffect, useMemo, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { LISTINGS } from '../../lib/mock/homeji'
import { listingCardId } from './sections/format'
import { CtaBand } from './sections/CtaBand'
import { FeaturedListings } from './sections/FeaturedListings'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { Navbar, type NavItem } from './sections/Navbar'
import type { ListingQuery } from './sections/SearchBar'
import { StoryJourney } from './sections/StoryJourney'
import { TrustStandard } from './sections/TrustStandard'
import { Testimonials } from './sections/Testimonials'
import { ValueProps } from './sections/ValueProps'
import './tokens.css'
import './base.css'
import './ui/ui.css'
import './landing.css'
import './story.css'
// Last, so the unlayered tw: utilities win ties against the class rules above.
import './tailwind.css'

const INITIAL_QUERY: ListingQuery = { kind: 'all', district: '', price: '' }

function scrollToListings() {
  const target = document.getElementById('tin-noi-bat')
  if (!target) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  // Move keyboard and screen-reader focus with the scroll.
  const heading = target.querySelector<HTMLElement>('h2')
  if (heading) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
}

/** Brings one listing card into view and gives it focus, so keyboard and screen-reader users land on it too. */
function scrollToCard(listingId: string) {
  const card = document.getElementById(listingCardId(listingId))
  if (!card) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  card.focus({ preventScroll: true })
}

/** How long a card stays outlined after the hero points at it. */
const HIGHLIGHT_MS = 2600

/**
 * Guest landing (route "/"). Self-contained: its own tokens, primitives and
 * chrome. The app's own reduced-motion override is replaced here by the
 * visitor's OS preference.
 */
export function LandingPage() {
  const [query, setQuery] = useState<ListingQuery>(INITIAL_QUERY)

  // `at` makes a second click on the same tile restart the highlight.
  const [highlight, setHighlight] = useState<{ id: string; at: number } | null>(null)

  const onSearch = useCallback((next: ListingQuery) => {
    setQuery(next)
    requestAnimationFrame(scrollToListings)
  }, [])

  const onShowListing = useCallback((listingId: string) => {
    const listing = LISTINGS.find(item => item.id === listingId)
    if (!listing) return
    // Reset filters to that listing's type so its card is guaranteed to be rendered.
    setQuery({ kind: listing.kind, district: '', price: '' })
    setHighlight({ id: listingId, at: Date.now() })
    requestAnimationFrame(() => scrollToCard(listingId))
  }, [])

  useEffect(() => {
    if (!highlight) return undefined
    const timer = window.setTimeout(() => setHighlight(null), HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [highlight])

  const navItems = useMemo<NavItem[]>(() => [
    { label: 'Tìm trọ', to: '#tin-noi-bat', onSelect: () => setQuery(current => ({ ...current, kind: 'room' })) },
    { label: 'Ở ghép', to: '#tin-noi-bat', onSelect: () => setQuery(current => ({ ...current, kind: 'roommate' })) },
    { label: 'Xác minh', to: '#xac-minh' },
    { label: 'Cách hoạt động', to: '#cach-hoat-dong' },
  ], [])

  return (
    <MotionConfig reducedMotion="user">
      {/* data-glass-exclude: opt out of the app-wide button glass paint. */}
      <div className="hx" data-glass-exclude>
        <a className="hx-skip" href="#hx-main">Bỏ qua tới nội dung chính</a>
        <Navbar items={navItems} />
        <main id="hx-main" tabIndex={-1}>
          <Hero onSearch={onSearch} onShowListing={onShowListing} />
          <ValueProps />
          <TrustStandard />
          <StoryJourney />
          <FeaturedListings query={query} onQueryChange={setQuery} highlightId={highlight?.id ?? null} />
          <HowItWorks />
          <Testimonials />
          <CtaBand />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
