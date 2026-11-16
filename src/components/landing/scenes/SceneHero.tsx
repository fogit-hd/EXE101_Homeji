import { useRef } from 'react'
import { useBrandIntroComplete } from '../../../hooks/useBrandIntroComplete'
import { useSceneReveal } from '../scroll/useSceneReveal'
import { buildHeroTimeline } from './sceneTimelines'

export function SceneHero() {
  const rootRef = useRef<HTMLElement>(null)
  const introComplete = useBrandIntroComplete()

  useSceneReveal({ rootRef, enabled: introComplete, buildTimeline: buildHeroTimeline })

  return (
    <section id="hero" ref={rootRef} className="hl-scene hl-scene--hero" data-landing-scene="hero">
      <div className="hl-scene__stage hl-scene__stage--hero">
        <p className="hl-scene__brand" data-scrub="brand">Homeji</p>
        <h1 className="hl-scene__title" data-scrub="title">Trọ an tâm. Nâng tầm cuộc sống.</h1>
        <p className="hl-scene__lead" data-scrub="lead">
          Tìm phòng và bạn ở ghép quanh Thủ Đức &amp; Quận 9 trên bản đồ tin cậy.
        </p>
        <div className="hl-scene__visual hl-scene__visual--hero" data-scrub="visual" aria-hidden="true">
          <div className="hl-scene__hero-glow" />
        </div>
      </div>
    </section>
  )
}
