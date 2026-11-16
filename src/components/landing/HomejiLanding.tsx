import { useEffect } from 'react'
import { useLandingSmoothScroll } from '../../hooks/useLandingSmoothScroll'
import { scrollLandingTo } from './scroll/landingScrollControl'
import {
  LANDING_NAV_EVENT,
  initialLandingSection,
  type LandingNavDetail,
} from './landingSections'
import { ExploreScene } from './explore/ExploreScene'
import { SceneHero } from './scenes/SceneHero'
import { SceneMission } from './scenes/SceneMission'
import { SceneHow } from './scenes/SceneHow'
import { SceneStart } from './scenes/SceneStart'
import './HomejiLanding.css'

export function HomejiLanding() {
  useLandingSmoothScroll(true)

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const id = (event as CustomEvent<LandingNavDetail>).detail?.id
      if (!id) return
      scrollLandingTo(id, { immediate: true })
    }
    window.addEventListener(LANDING_NAV_EVENT, onNavigate)
    return () => window.removeEventListener(LANDING_NAV_EVENT, onNavigate)
  }, [])

  useEffect(() => {
    const target = initialLandingSection(window.location)
    if (!target) return undefined
    const section = target === 'listings' ? 'map' : target
    const go = () => scrollLandingTo(section, { immediate: true })
    go()
    const timers = [80, 320, 900, 1800].map(ms => window.setTimeout(go, ms))
    return () => timers.forEach(window.clearTimeout)
  }, [])

  return (
    <div className="hl" data-glass-exclude>
      <main className="hl__main">
        <SceneHero />
        <SceneMission />
        <ExploreScene />
        <SceneHow />
        <SceneStart />
      </main>
      <footer className="hl__footer">
        <p>Homeji</p>
      </footer>
    </div>
  )
}
