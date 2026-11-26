import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, Info, Megaphone, Pause, Play, Search, Users } from 'lucide-react'
import { ButtonLink } from '../ui/Button'
import { jumpToSection } from '../jump'
import type { StoryActions } from './ScrollyStory'
import { BILL, CHAPTERS, CHECKS, money, QUERY, RESULTS } from './storyData'
import { DayDial } from './DayDial'
import './phone-story.css'

/** How long one chapter stays up before the story moves on by itself. */
const SLIDE_MS = 7000
function jumpTo(event: MouseEvent, id: string) {
  const target = document.getElementById(id)
  if (!target) return
  event.preventDefault()
  jumpToSection(target, `#${id}`)
}

function Head({ n, title, id, children }: { n: number; title: string; id: string; children: ReactNode }) {
  return (
    <header className="hx-ms__head">
      <p className="hx-ms__kicker"><span aria-hidden="true">{String(n).padStart(2, '0')}</span>{CHAPTERS[n - 1]}</p>
      <h2 id={id} className="hx-ms__h2" tabIndex={-1}>{title}</h2>
      <p className="hx-ms__line">{children}</p>
    </header>
  )
}

/**
 * The five chapters on phones, told as a story: one chapter fills the screen, a bar per chapter
 * fills at the top, and the story moves on by itself. A tap on the right half skips ahead, on the
 * left half goes back, and the pause button holds it. Nothing locks the page: a visitor who does
 * not want the story simply scrolls past it to the rooms.
 * Each chapter has its own motion, played when it comes up: 01 a search types and results rise,
 * 02 a receipt prints, 03 a checklist ticks down a line, 04 a day runs down two columns,
 * 05 a window lights up in the dark.
 */
export function PhoneStory({ actions }: { actions: StoryActions }) {
  const rootRef = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(() => (location.hash === '#xac-minh' ? 2 : 0))
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(false)
  const [reduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const last = CHAPTERS.length - 1
  // The story only runs while most of it is on screen, never with reduced motion, and stops at the end.
  const running = !reduce && !paused && inView

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.6 })
    io.observe(root)
    return () => io.disconnect()
  }, [])

  // "Xác minh" links anywhere on the page open chapter 03 and hold it there.
  useEffect(() => {
    const open = (event: globalThis.MouseEvent) => {
      if ((event.target as Element | null)?.closest('a[href="#xac-minh"]')) {
        setIndex(2)
        setPaused(true)
      }
    }
    document.addEventListener('click', open, true)
    return () => document.removeEventListener('click', open, true)
  }, [])

  const go = (to: number) => setIndex(Math.min(Math.max(to, 0), last))

  return (
    <section ref={rootRef} className="hx-ms" aria-roledescription="carousel" aria-label="Homeji trong 5 chương">
      <span id="xac-minh" className="hx-ms__anchor" data-focus="hx-ms-h-verify" aria-hidden="true" />
      <div className="hx-ms__top">
        <ol className="hx-ms__bars" aria-hidden="true">
          {CHAPTERS.map((title, i) => (
            <li key={title} className={i < index ? 'is-done' : i === index ? 'is-on' : undefined}>
              {i === index && !reduce && (
                <i
                  key={index}
                  style={{ '--dur': `${SLIDE_MS}ms`, animationPlayState: running ? 'running' : 'paused' } as CSSProperties}
                  onAnimationEnd={() => { if (index < last) go(index + 1) }}
                />
              )}
            </li>
          ))}
        </ol>
        <p className="hx-ms__where" aria-live="polite">{String(index + 1).padStart(2, '0')} / 05 · {CHAPTERS[index]}</p>
        {!reduce && (
          <button type="button" className="hx-ms__pause" onClick={() => setPaused(p => !p)} aria-label={paused ? 'Tiếp tục tự chạy' : 'Tạm dừng'}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className="hx-ms__stage">
        {/* Tap zones sit under the content; only links and buttons in a chapter take taps themselves. */}
        <button type="button" className="hx-ms__tap hx-ms__tap--back" aria-label="Chương trước" disabled={index === 0} onClick={() => go(index - 1)} />
        <button type="button" className="hx-ms__tap hx-ms__tap--next" aria-label="Chương sau" disabled={index === last} onClick={() => go(index + 1)} />

        <Slide n={1} index={index}>
          <Head n={1} id="hx-ms-h-near" title="Gần trường, đúng túi tiền.">Chọn khu vực và mức giá, chỉ hiện phòng trong tầm đi bộ.</Head>
          <figure className="hx-ms__find" aria-label="Ví dụ một lượt tìm">
            <p className="hx-ms__query" aria-hidden="true"><Search /><span>{QUERY}</span></p>
            <ul>
              {RESULTS.map(room => (
                <li key={room.title}>
                  <span><strong>{room.title}</strong>{room.where}</span>
                  <b>{room.price}</b>
                  <em><i />{room.walk}</em>
                </li>
              ))}
            </ul>
            <figcaption>Minh họa</figcaption>
          </figure>
          <div className="hx-ms__act">
            <ButtonLink to="#tin-noi-bat" variant="accent" size="lg" trailingIcon={<ArrowRight aria-hidden="true" />} onClick={event => jumpTo(event, 'tin-noi-bat')}>Tìm phòng</ButtonLink>
          </div>
        </Slide>

        <Slide n={2} index={index}>
          <Head n={2} id="hx-ms-h-price" title="Giá rõ từng khoản, kể cả điện.">Tiền phòng, điện, nước, wifi ghi đủ trên tin.</Head>
          <figure className="hx-ms__receipt" aria-label="Ví dụ cách một tin ghi giá">
            <figcaption>Ví dụ · Phòng 16 m², Linh Trung</figcaption>
            <dl>
              {BILL.map(line => (
                <div key={line.label} className={line.hot ? 'is-hot' : undefined}>
                  <dt>{line.label}</dt>
                  <dd>{money(line.amount)}<small>{line.note}</small></dd>
                </div>
              ))}
            </dl>
            <p className="hx-ms__stamp">Ghi đủ trên tin</p>
          </figure>
        </Slide>

        <Slide n={3} index={index}>
          <Head n={3} id="hx-ms-h-verify" title="3 bước xác minh trước khi đăng.">Tin lên Homeji sau khi chủ nhà qua đủ ba bước.</Head>
          <ol className="hx-ms__checks">
            {CHECKS.map(check => (
              <li key={check.title}>
                <span className="hx-ms__check-icon">{check.icon}</span>
                <span><strong>{check.title}</strong>{check.body}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" pathLength={1} /></svg>
              </li>
            ))}
          </ol>
          <p className="hx-ms__note"><Info aria-hidden="true" />Chỉ đặt cọc sau khi đã xem phòng và gặp đúng chủ nhà.</p>
        </Slide>

        <Slide n={4} index={index}>
          <Head n={4} id="hx-ms-h-share" title="Ở ghép hợp nhịp sống.">Tìm bạn cùng trường theo giờ ngủ, nấu ăn và độ yên tĩnh.</Head>
          <DayDial />
          <div className="hx-ms__act">
            <button type="button" className="hx-sc__pill" onClick={actions.onRoommates}><Users aria-hidden="true" />Tìm bạn ở ghép<ArrowRight aria-hidden="true" /></button>
          </div>
        </Slide>

        <Slide n={5} index={index} dark>
          <div className="hx-ms__window" aria-hidden="true"><i /><i /><i /><i /></div>
          <Head n={5} id="hx-ms-h-home" title="Phòng của bạn đang sáng đèn.">Chọn khu vực, xem phòng đã xác minh, hẹn xem rồi mới đặt cọc.</Head>
          <div className="hx-ms__act hx-ms__act--stack">
            <ButtonLink to="#tin-noi-bat" variant="accent" size="lg" trailingIcon={<ArrowRight aria-hidden="true" />} onClick={event => jumpTo(event, 'tin-noi-bat')}>Tìm phòng ngay</ButtonLink>
            <a className="hx-sc-link" href="#cho-chu-nha" onClick={event => jumpTo(event, 'cho-chu-nha')}><Megaphone aria-hidden="true" />Có phòng trống? Đăng tin cho thuê</a>
          </div>
        </Slide>
      </div>

      <a className="hx-ms__skip" href="#tin-noi-bat" onClick={event => jumpTo(event, 'tin-noi-bat')}><ArrowDown aria-hidden="true" />Bỏ qua, xem phòng</a>
    </section>
  )
}

/** One chapter: stacked in the same grid cell as the others; only the current one is shown and reachable. */
function Slide({ n, index, dark, children }: { n: number; index: number; dark?: boolean; children: ReactNode }) {
  const on = index === n - 1
  return (
    <div
      className={`hx-ms__slide hx-ms__slide--${n}${dark ? ' hx-ms__slide--dark' : ''}${on ? ' is-on' : ''}`}
      role="group"
      aria-roledescription="slide"
      aria-label={`${n} / 5: ${CHAPTERS[n - 1]}`}
      inert={!on}
      aria-hidden={!on}
    >
      {children}
    </div>
  )
}
