import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import { toggleHomejiAi } from '../../lib/homejiAiLauncher'
import { promoBannerArt } from './promoBannerArt'
import './PromoBanner.css'

type Slide = {
  eyebrow: string
  title: string
  keyword: string
  sub: string
  cta: string
  to?: string
  accent: string
  bg: [string, string]
  dot: string
}

const SLIDES: Slide[] = [
  { eyebrow: 'Mời bạn cùng dùng', title: 'Cả hai nhận voucher', keyword: 'tối đa 50k/người', sub: 'Bạn mới xác nhận email và nhận lời mời. Đợt này có 10 lượt nhận quà; xem điều kiện áp dụng.', cta: 'Mời bạn & nhận quà', to: '/referrals', accent: '#a43c22', bg: ['#fff8ee', '#ffe9d6'], dot: '#f3d9c2' },
  { eyebrow: 'Tính năng mới', title: 'Tìm bạn ở ghép', keyword: 'hợp gu', sub: 'Ghép theo giờ giấc, ngân sách và thói quen sinh hoạt của bạn.', cta: 'Thử ngay', to: mapSectionUrl('invitations'), accent: '#00b14f', bg: ['#f1faf4', '#d9f3e3'], dot: '#cfe9d8' },
  { eyebrow: 'Quanh nơi bạn ở', title: 'Chợ đồ & đồ ăn', keyword: 'quanh trọ', sub: 'Tìm đồ dùng và món ăn theo người bán. Xem địa chỉ nhận trước khi đặt.', cta: 'Khám phá chợ', to: mapSectionUrl('marketplace'), accent: '#0f7c80', bg: ['#eef8f8', '#d5eeee'], dot: '#c8e3e3' },
  { eyebrow: 'Xem phòng dễ dàng', title: 'Đặt lịch xem phòng', keyword: 'theo giờ bạn rảnh', sub: 'Chọn giờ rảnh, chờ chủ trọ xác nhận trong ứng dụng.', cta: 'Đặt lịch ngay', to: mapSectionUrl('listings'), accent: '#b7791f', bg: ['#fffaf0', '#ffeec7'], dot: '#f0dfb6' },
  { eyebrow: 'Trợ lý Homeji AI', title: 'AI gợi ý phòng', keyword: 'hợp gu', sub: 'Nói nhu cầu của bạn, AI chọn ra những phòng phù hợp nhất.', cta: 'Hỏi AI ngay', accent: '#00a047', bg: ['#effaf6', '#d4f1e6'], dot: '#c9e8dc' },
  { eyebrow: 'Gói VIP Homeji', title: 'Chọn gói VIP', keyword: 'phù hợp nhu cầu', sub: 'Xem giá, thời hạn và quyền lợi của từng gói trước khi thanh toán.', cta: 'Xem các gói', to: mapSectionUrl('payments'), accent: '#24543e', bg: ['#f1f6f8', '#d9eaf0'], dot: '#cfe0e6' },
  { eyebrow: 'Quản lý tin cho thuê', title: 'Đăng và quản lý', keyword: 'tin của bạn', sub: 'Thêm ảnh, giá và địa chỉ rõ ràng để người thuê dễ tìm hiểu.', cta: 'Quản lý tin', to: mapSectionUrl('myPosts'), accent: '#a43c22', bg: ['#fdf3ef', '#f9dccf'], dot: '#f0d5c8' },
  { eyebrow: 'Voucher của bạn', title: 'Ưu đãi đồ ăn', keyword: 'và gói VIP', sub: 'Xem voucher còn hạn, mức giảm và điều kiện dùng trong tài khoản của bạn.', cta: 'Xem voucher', to: '/referrals', accent: '#3f7d1f', bg: ['#f5faec', '#e1f0c9'], dot: '#d9e8c2' },
]

const INTERVAL_MS = 5000
const EASE = [0.22, 1, 0.36, 1] as const

/** Eight-slide promo carousel on the signed-in home. */
export function PromoBanner() {
  const [[index, dir], setState] = useState<[number, number]>([0, 1])
  const [paused, setPaused] = useState(false)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const count = SLIDES.length

  const go = useCallback(
    (step: number) => setState(([i]) => [(i + step + count) % count, step >= 0 ? 1 : -1]),
    [count],
  )
  const jump = (to: number) => setState(([i]) => [to, to >= i ? 1 : -1])

  useEffect(() => {
    if (paused) return
    const id = window.setTimeout(() => go(1), INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [index, paused, go])

  const slide = SLIDES[index]
  const ctaLabel = `${slide.cta} →`

  return (
    <section
      className="hub-promo"
      aria-roledescription="carousel"
      aria-label="Ưu đãi và tính năng Homeji"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={index}
          className="hub-promo__slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} / ${count}`}
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
            dangerouslySetInnerHTML={{ __html: promoBannerArt[index] }}
          />
          <div className="hub-promo__copy">
            <p className="hub-promo__eyebrow" style={{ color: slide.accent }}>{slide.eyebrow}</p>
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
        {SLIDES.map((s, i) => (
          <button
            key={s.eyebrow + s.keyword}
            type="button"
            className={i === index ? 'is-on' : undefined}
            data-glass-exclude=""
            aria-label={`Banner ${i + 1}`}
            aria-current={i === index}
            onClick={() => jump(i)}
          >
            {i === index ? <motion.span layoutId="hub-promo-dot" transition={{ duration: 0.35, ease: EASE }} /> : null}
          </button>
        ))}
      </div>
      <div className="hub-promo__arrows">
        <button type="button" aria-label="Banner trước" onClick={() => go(-1)}>‹</button>
        <button type="button" aria-label="Banner tiếp" onClick={() => go(1)}>›</button>
      </div>
    </section>
  )
}
