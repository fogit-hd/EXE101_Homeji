import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { UserRole } from '../../api/types'
import { toggleHomejiAi } from '../../lib/homejiAiLauncher'
import { promoBannerArt } from './promoBannerArt'
import { getPromoSlidesForRole, type PromoBannerVariant } from './promoBannerSlides'
import { useIsMobile } from '../../mobile/useIsMobile'
import { MobilePromoCarousel } from '../../mobile/hub/MobilePromoCarousel'
import './PromoBanner.css'

const INTERVAL_MS = 5000
const EASE = [0.22, 1, 0.36, 1] as const

/** Promo carousel on the signed-in home (supports full hero or compact rail layout). */
export function PromoBanner({ variant = 'hero', role }: { variant?: PromoBannerVariant; role?: UserRole | null } = {}) {
  const slides = useMemo(() => getPromoSlidesForRole(role), [role])
  const count = slides.length
  const [[index, dir], setState] = useState<[number, number]>([0, 1])
  const [paused, setPaused] = useState(false)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const mobile = useIsMobile()

  const go = useCallback(
    (step: number) => setState(([i]) => [(i + step + count) % count, step >= 0 ? 1 : -1]),
    [count],
  )
  const jump = (to: number) => setState(([i]) => [to, to >= (i % count) ? 1 : -1])

  useEffect(() => {
    if (paused || mobile) return
    const id = window.setTimeout(() => go(1), INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [index, paused, go, mobile])

  if (mobile) return <MobilePromoCarousel slides={slides} />

  const safeIndex = index % count
  const slide = slides[safeIndex]
  const ctaLabel = `${slide.cta} →`

  return (
    <section
      className={`hub-promo${variant === 'rail' ? ' hub-promo--rail' : ''}`}
      aria-roledescription="carousel"
      aria-label="Ưu đãi và tính năng Homeji"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={`${role ?? 'all'}-${safeIndex}`}
          className="hub-promo__slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${safeIndex + 1} / ${count}`}
          custom={dir}
          style={{
            backgroundImage: `radial-gradient(${slide.dot} 1.2px, transparent 1.3px), linear-gradient(100deg, ${slide.bg[0]} 55%, ${slide.bg[1]})`,
            backgroundSize: '18px 18px, auto',
          }}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: d * 40 }),
            center: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: d * -40 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: EASE }}
        >
          <motion.svg
            className="hub-promo__art"
            viewBox="0 0 420 244"
            aria-hidden
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            dangerouslySetInnerHTML={{ __html: promoBannerArt[slide.artIndex] ?? '' }}
          />
          <div className="hub-promo__copy">
            
            <h2 className="hub-promo__title">
              {slide.title} <em style={{ color: slide.accent }}>{slide.keyword}</em>
            </h2>
            <p className="hub-promo__sub">{slide.sub}</p>
            {slide.to ? (
              <Link data-glass-exclude className="hub-promo__cta liquid-action" to={slide.to} style={{ '--promo-accent': slide.accent } as CSSProperties}>
                {ctaLabel}
              </Link>
            ) : (
              <button
                ref={ctaRef}
                type="button"
                data-glass-exclude className="hub-promo__cta liquid-action"
                style={{ '--promo-accent': slide.accent } as CSSProperties}
                onClick={() => toggleHomejiAi(ctaRef.current, true)}
              >
                {ctaLabel}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="hub-promo__dots">
        {slides.map((s, i) => (
          <button
            key={s.eyebrow + s.keyword}
            type="button"
            className={i === safeIndex ? 'is-on' : undefined}
            data-glass-exclude=""
            aria-label={`Banner ${i + 1}`} title={`Banner ${i + 1}`}
            aria-current={i === safeIndex}
            onClick={() => jump(i)}
          >
            {i === safeIndex ? <motion.span layoutId="hub-promo-dot" transition={{ duration: 0.35, ease: EASE }} /> : null}
          </button>
        ))}
      </div>
      <div className="hub-promo__arrows">
        <button type="button" aria-label="Banner trước" title="Banner trước" onClick={() => go(-1)}><ChevronLeft aria-hidden="true" size={18} /></button>
        <button type="button" aria-label="Banner tiếp" title="Banner tiếp" onClick={() => go(1)}><ChevronRight aria-hidden="true" size={18} /></button>
      </div>
    </section>
  )
}
