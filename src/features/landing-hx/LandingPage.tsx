import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { FeaturedListings } from './sections/FeaturedListings'
import { Footer } from './sections/Footer'
import { HowItWorks } from './sections/HowItWorks'
import { Navbar, type NavCard, type NavItem } from './sections/Navbar'
import { formatMillions } from './sections/format'
import { DISTRICT_OPTIONS } from '../../lib/mock/homeji'
import type { ListingQuery } from './sections/SearchBar'
import { useLandingListings } from './sections/useLandingListings'
import { markLandingReady } from './introGate'
import { jumpToSection } from './jump'
import { StoryFilm } from './story/StoryFilm'
import './tokens.css'
import './base.css'
import './ui/ui.css'
import './landing.css'
import './story/story.css'
import './sections/sections.css'
// Last, so the unlayered tw: utilities win ties against the class rules above.
import './tailwind.css'

const INITIAL_QUERY: ListingQuery = { kind: 'all', district: '', price: '' }

function scrollToListings() {
  const target = document.getElementById('tin-noi-bat')
  if (target) jumpToSection(target)
}

/**
 * Guest landing (route "/"). Self-contained: its own tokens, primitives and
 * chrome. The app's own reduced-motion override is replaced here by the
 * visitor's OS preference.
 */
export function LandingPage() {
  const [query, setQuery] = useState<ListingQuery>(INITIAL_QUERY)
  const [eagerListings, setEagerListings] = useState(false)
  const listingsSectionRef = useRef<HTMLElement>(null)
  const { listings } = useLandingListings(listingsSectionRef, eagerListings)

  // The opening intro fades out once the film's first frame is here to be seen (or after a moment).
  useEffect(() => {
    const poster = document.querySelector<HTMLImageElement>('.hx-film__poster, .hx-film__still')
    if (!poster || poster.complete) return markLandingReady()
    poster.addEventListener('load', markLandingReady, { once: true })
    poster.addEventListener('error', markLandingReady, { once: true })
    const timer = window.setTimeout(markLandingReady, 2500)
    return () => window.clearTimeout(timer)
  }, [])

  const onSearch = useCallback((next: ListingQuery) => {
    setEagerListings(true)
    setQuery(next)
    requestAnimationFrame(scrollToListings)
  }, [])

  const onRoommates = useCallback(() => {
    setEagerListings(true)
    setQuery(current => ({ ...current, kind: 'roommate' }))
    requestAnimationFrame(scrollToListings)
  }, [])

  // The "Tìm trọ" panel: one card per area that has listings, its photo and the lowest rent there.
  const areaCards = useMemo<NavCard[]>(() => DISTRICT_OPTIONS.filter(option => option.value).flatMap(option => {
    const here = listings
      .filter(listing => listing.district === option.label && listing.price > 0)
      .sort((a, b) => a.price - b.price)
    if (!here.length) return []
    return [{
      id: option.value,
      title: option.label,
      meta: `Từ ${formatMillions(here[0].price)}/tháng`,
      image: { src: here[0].image.srcSmall, alt: here[0].image.alt },
      onSelect: () => {
        setEagerListings(true)
        setQuery(current => ({ ...current, kind: 'all', district: option.value }))
      },
    }]
  }).slice(0, 4), [listings])

  const navItems = useMemo<NavItem[]>(() => [
    {
      label: 'Tìm trọ',
      to: '#tin-noi-bat',
      onSelect: () => {
        setEagerListings(true)
        setQuery(current => ({ ...current, kind: 'room' }))
      },
      cards: areaCards,
    },
    {
      label: 'Ở ghép',
      to: '#tin-noi-bat',
      onSelect: () => {
        setEagerListings(true)
        setQuery(current => ({ ...current, kind: 'roommate' }))
      },
    },
    { label: 'Xác minh', to: '#xac-minh' },
    { label: 'Cách hoạt động', to: '#cach-hoat-dong' },
  ], [areaCards])

  return (
    <MotionConfig reducedMotion="user">
      {/* data-glass-exclude: opt out of the app-wide button glass paint. */}
      <div className="hx" data-glass-exclude>
        <a className="hx-skip" href="#hx-main">Bỏ qua tới nội dung chính</a>
        <Navbar items={navItems} />
        <main id="hx-main" tabIndex={-1}>
          {/* The opening film: the house, the door, then the corners of An's story (see story/StoryFilm.tsx). */}
          <StoryFilm onSearch={onSearch} onRoommates={onRoommates} />
          <FeaturedListings
            listings={listings}
            sectionRef={listingsSectionRef}
            query={query}
            onQueryChange={next => {
              setEagerListings(true)
              setQuery(next)
            }}
          />
          <HowItWorks />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
