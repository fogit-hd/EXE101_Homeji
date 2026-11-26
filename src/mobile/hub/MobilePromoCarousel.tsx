import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { toggleHomejiAi } from '../../lib/homejiAiLauncher'
import { promoBannerArt } from '../../components/hub/promoBannerArt'
import type { PromoSlide } from '../../components/hub/promoBannerSlides'
import './mobile-promo.css'

/**
 * Phone promo strip: cards the thumb swipes (native scroll-snap), the next one peeking in.
 * Each card shows its illustration full width on top and the copy underneath, so text never
 * sits on the art and nothing moves on its own.
 */
export function MobilePromoCarousel({ slides }: { slides: readonly PromoSlide[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const aiRef = useRef<HTMLButtonElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const items = [...track.children] as HTMLElement[]
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(items.indexOf(entry.target as HTMLElement))
      }
    }, { root: track, threshold: 0.6 })
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [slides])

  const goTo = (index: number) => {
    const item = trackRef.current?.children[index] as HTMLElement | undefined
    if (!item || !trackRef.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    trackRef.current.scrollTo({ left: item.offsetLeft - trackRef.current.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <section className="m-promo" aria-roledescription="carousel" aria-label="Ưu đãi và tính năng Homeji">
      <ul ref={trackRef} className="m-promo__track">
        {slides.map((slide, index) => {
          const style = { '--promo-accent': slide.accent, '--promo-bg-a': slide.bg[0], '--promo-bg-b': slide.bg[1], '--promo-dot': slide.dot } as CSSProperties
          return (
            <li key={`${slide.artIndex}-${slide.title}`} className="m-promo__card" style={style}
              aria-roledescription="slide" aria-label={`${index + 1} / ${slides.length}`}>
              <div className="m-promo__art">
                <svg viewBox="0 0 420 244" aria-hidden="true" focusable="false"
                  dangerouslySetInnerHTML={{ __html: promoBannerArt[slide.artIndex] ?? '' }} />
              </div>
              <div className="m-promo__copy">
                <p className="m-promo__eyebrow">{slide.eyebrow}</p>
                <h2 className="m-promo__title">{slide.title} <em>{slide.keyword}</em></h2>
                <p className="m-promo__sub">{slide.sub}</p>
                {slide.to ? (
                  <Link className="m-promo__cta" to={slide.to} data-glass-exclude="">{slide.cta}<span aria-hidden="true">→</span></Link>
                ) : (
                  <button ref={aiRef} type="button" className="m-promo__cta" data-glass-exclude=""
                    onClick={() => toggleHomejiAi(aiRef.current, true)}>{slide.cta}<span aria-hidden="true">→</span></button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {slides.length > 1 ? (
        <div className="m-promo__dots">
          {slides.map((slide, index) => (
            <button key={`${slide.artIndex}-${slide.title}`} type="button" aria-label={`Xem ưu đãi ${index + 1}: ${slide.title}`}
              aria-current={index === active ? 'true' : undefined} onClick={() => goTo(index)} data-glass-exclude="" />
          ))}
        </div>
      ) : null}
    </section>
  )
}
