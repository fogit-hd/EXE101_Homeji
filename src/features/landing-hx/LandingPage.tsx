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
import { ScrollyStory } from './scrolly/ScrollyStory'
import { LandlordBlock } from './pinstory/LandlordBlock'
import './tokens.css'
import './base.css'
import './ui/ui.css'
import './landing.css'
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
  const listingsSectionRef = useRef<HTMLElement>(null)
  // Fetched straight away: the map story puts the live listings on the map.
  const { listings } = useLandingListings(listingsSectionRef, true)

  // The opening intro fades out once the map story has painted its first frame.
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(markLandingReady)
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  const onSearch = useCallback((next: ListingQuery) => {
    setQuery(next)
    requestAnimationFrame(scrollToListings)
  }, [])

  const onRoommates = useCallback(() => {
    setQuery(current => ({ ...current, kind: 'roommate' }))
    requestAnimationFrame(scrollToListings)
  }, [])

  const storyActions = useMemo(() => ({ onSearch, onRoommates }), [onSearch, onRoommates])

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
        setQuery(current => ({ ...current, kind: 'all', district: option.value }))
      },
    }]
  }).slice(0, 4), [listings])

  const navItems = useMemo<NavItem[]>(() => [
    {
      label: 'Tìm trọ',
      to: '#tin-noi-bat',
      onSelect: () => {
        setQuery(current => ({ ...current, kind: 'room' }))
      },
      cards: areaCards,
      spy: '[data-chapter="near"], #tin-noi-bat',
    },
    {
      label: 'Ở ghép',
      to: '#tin-noi-bat',
      onSelect: () => {
        setQuery(current => ({ ...current, kind: 'roommate' }))
      },
      spy: '[data-chapter="share"]',
    },
    { label: 'Xác minh', to: '#xac-minh', spy: '[data-chapter="verify"]' },
    { label: 'Cách hoạt động', to: '#cach-hoat-dong', spy: '#cach-hoat-dong' },
  ], [areaCards])

  return (
    <MotionConfig reducedMotion="user">
      {/* data-glass-exclude: opt out of the app-wide button glass paint. */}
      <div className="hx" data-glass-exclude>
        <a className="hx-skip" href="#hx-main">Bỏ qua tới nội dung chính</a>
        <Navbar items={navItems} />
        <main id="hx-main" tabIndex={-1}>
          {/* The opening story: hero + five dusk chapters, with Homeji's 3D pin flying through them (see scrolly/). */}
          <ScrollyStory actions={storyActions} />
          <FeaturedListings
            listings={listings}
            sectionRef={listingsSectionRef}
            query={query}
            onQueryChange={next => {
              setQuery(next)
            }}
          />
          <HowItWorks />
          <LandlordBlock />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
