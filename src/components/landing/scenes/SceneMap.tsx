import { useRef } from 'react'
import { useBrandIntroComplete } from '../../../hooks/useBrandIntroComplete'
import { useSceneReveal } from '../scroll/useSceneReveal'
import { buildMapTimeline } from './sceneTimelines'

/**
 * Map scene: play-once entrance for the chrome; the map canvas is never pinned.
 * Future gmp-map / .gm-style should sit inside [data-landing-scroll-native]
 * so Lenis prevent() keeps native map gestures.
 */
export function SceneMap() {
  const rootRef = useRef<HTMLElement>(null)
  const introComplete = useBrandIntroComplete()

  useSceneReveal({ rootRef, enabled: introComplete, buildTimeline: buildMapTimeline })

  return (
    <section id="map" ref={rootRef} className="hl-scene hl-scene--map hl-scene--no-pin" data-landing-scene="map">
      <div className="hl-scene__stage">
        <header className="hl-scene__copy">
          <p className="hl-scene__eyebrow">Bản đồ khu vực</p>
          <h2 className="hl-scene__title" data-scrub="title">Thủ Đức &amp; Quận 9 trên map</h2>
          <p className="hl-scene__lead" data-scrub="lead">
            Khi gắn Google Maps, gesture và scroll gốc của map được giữ — Lenis bỏ qua khung native.
          </p>
        </header>
        <div
          className="hl-scene__map-frame"
          data-scrub="map-frame"
          data-landing-scroll-native
          data-lenis-prevent
        >
          <p className="hl-scene__map-placeholder">Khung bản đồ (chưa gắn Maps)</p>
        </div>
      </div>
    </section>
  )
}
