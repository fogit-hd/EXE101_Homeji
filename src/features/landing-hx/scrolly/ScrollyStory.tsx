import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ChevronDown, Info, Megaphone, Search, Users } from 'lucide-react'
import { Button, ButtonLink } from '../ui/Button'
import { DISTRICT_OPTIONS, PRICE_OPTIONS } from '../../../lib/mock/homeji'
import { AREAS, BILL, CHECKS, clock, DAY_FROM, DAY_TO, money, QUERY, RESULTS, SHARED, sweep, dialAngle } from './storyData'
import { DayDial } from './DayDial'
import type { ListingQuery } from '../sections/SearchBar'
import { jumpToSection } from '../jump'
import { loadGsap } from '../mapstory/loadGsap'
import { PhoneStory } from './PhoneStory'
import './scrolly.css'

export type StoryActions = { onSearch: (query: ListingQuery) => void; onRoommates: () => void }

const IMG = '/landing/dusk'
/** Phones get their own telling of the chapters (a tap-through story); wider screens get the scroll film. */
const PHONE = '(max-width: 767px)'
const watchPhone = (onChange: () => void) => {
  const mq = window.matchMedia(PHONE)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
const isPhone = () => window.matchMedia(PHONE).matches

function jumpTo(event: MouseEvent, id: string) {
  const target = document.getElementById(id)
  if (!target) return
  event.preventDefault()
  jumpToSection(target, `#${id}`)
}

function Field({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="hx-sc__field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown aria-hidden="true" />
    </div>
  )
}

/** The real search: area and price, handed to the listings below. */
function SearchForm({ actions }: { actions: StoryActions }) {
  const [district, setDistrict] = useState('')
  const [price, setPrice] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    actions.onSearch({ kind: 'room', district, price })
  }
  return (
    <form className="hx-sc__search" role="search" aria-label="Tìm phòng trọ" onSubmit={submit}>
      <Field id="hx-sc-district" label="Khu vực" value={district} options={DISTRICT_OPTIONS} onChange={setDistrict} />
      <Field id="hx-sc-price" label="Mức giá" value={price} options={PRICE_OPTIONS} onChange={setPrice} />
      <Button type="submit" variant="accent" size="lg" icon={<Search aria-hidden="true" />}>Tìm phòng</Button>
    </form>
  )
}

function Kicker({ n, children }: { n: number; children: ReactNode }) {
  return <p className="hx-sc__kicker"><span aria-hidden="true">{String(n).padStart(2, '0')}</span>{children}</p>
}

/**
 * The opening story. A photographed hero, then five chapters on the same night ground, each told with
 * its own kind of motion so no two screens feel alike, held together by one palette, one easing
 * language and the story bar in the nav (chapter name + progress line):
 * 01 a search types itself in giant letters and its results rise (kinetic type + stagger)
 * 02 a bill prints line by line (vertical unroll + counting)
 * 03 pinned: three face-down cards flip in 3D and fan out (flip + fan)
 * 04 two roommate profiles slide in from opposite edges and lock together (horizontal converge)
 * 05 one lit window grows until its light fills the screen and hands over to the light page (mask)
 * Every chapter is a tall section with a sticky frame; each frame's timeline is scrubbed by the scroll
 * through its own section (scrub: 1, so motion trails the finger with a little weight).
 */
export function ScrollyStory({ actions }: { actions: StoryActions }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const phone = useSyncExternalStore(watchPhone, isPhone)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let alive = true
    let cleanup = () => {}
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return // every chapter's resting (final) state is its CSS default

    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (!alive) return
      const bar = document.querySelector<HTMLElement>('.hx-nav')
      const ctx = gsap.context(() => {
        const q = gsap.utils.selector(root)
        const one = (selector: string) => q(selector)[0] as HTMLElement
        const sec = (name: string) => one(`[data-chapter="${name}"]`)
        // A chapter's own timeline: runs while its frame is stuck to the screen.
        const scene = (name: string, start = 'top top') =>
          gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: sec(name), start, end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true } })

        // ── Hero: the photo's three depths part, the title lifts away ──────────
        const hero = one('.hx-sc__hero')
        const heroTl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } })
        heroTl.to(q('.hx-sc__layer--sky'), { yPercent: -10 }, 0)
        heroTl.to(q('.hx-sc__layer--lane'), { scale: 1.16, yPercent: 5 }, 0)
        heroTl.to(q('.hx-sc__layer--fore'), { scale: 1.35, yPercent: 12, autoAlpha: 0 }, 0)
        heroTl.to(q('.hx-sc__hero-copy'), { yPercent: -18, autoAlpha: 0 }, 0)
        heroTl.to(q('.hx-sc__hint'), { autoAlpha: 0, duration: 0.25 }, 0)
        // (the rest of the film is for wider screens; phones tell the chapters as a story)
        // On arrival: the lane settles, then the two lines of the title rise in.
        gsap.from(q('.hx-sc__layer--lane'), { scale: 1.08, duration: 1.8, ease: 'power3.out' })
        gsap.from(q('.hx-sc__layer--fore'), { scale: 1.2, autoAlpha: 0, duration: 1.6, ease: 'power3.out' })
        gsap.from(q('.hx-sc__h1 > span'), { yPercent: 40, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.15 })
        gsap.from(q('.hx-sc__sub, .hx-sc__hero .hx-sc__actions'), { y: 16, autoAlpha: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, delay: 0.5 })

        if (phone) return
        // ── Copy of every chapter rises in as its section arrives ─────────────
        q('.hx-sc__copy').forEach(copy => {
          gsap.fromTo(copy, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: 'power2.out', scrollTrigger: { trigger: copy.closest('.hx-sc__sec'), start: 'top 75%', end: 'top 20%', scrub: 1 } })
        })

        // ── Story bar: across the five chapters the nav names the chapter and fills a progress line ──
        // Written straight onto the nav element (data-story, data-step, --story): no React render per frame.
        if (bar) {
          ScrollTrigger.create({
            trigger: sec('near'),
            endTrigger: sec('home'),
            start: 'top 60%',
            end: 'bottom bottom',
            onToggle: self => { if (self.isActive) bar.dataset.story = ''; else delete bar.dataset.story },
            onUpdate: self => bar.style.setProperty('--story', self.progress.toFixed(4)),
          })
          q('.hx-sc__sec').forEach((section, i) => {
            ScrollTrigger.create({ trigger: section, start: 'top 50%', end: 'bottom 50%', onToggle: self => { if (self.isActive) bar.dataset.step = String(i + 1) } })
          })
        }

        // ── 01: the query types itself, the filter chip lands, three results rise ──
        const near = scene('near', 'top 40%')
        // A letter not yet typed takes no room (display, not opacity), so the caret right after them follows
        // the typing. One counter drives all letters: a staggered display tween only hides the first one.
        const letters = q('.hx-sc__typed > span')
        const typed = { n: 0 }
        const showTyped = () => letters.forEach((letter, i) => { letter.style.display = i < typed.n ? '' : 'none' })
        near.fromTo(typed, { n: 0 }, { n: letters.length, duration: letters.length * 0.06, ease: 'none', onUpdate: showTyped }, 0)
        showTyped()
        near.fromTo(q('.hx-sc__caret'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1 }, 0.75)
        near.fromTo(q('.hx-sc__filter'), { autoAlpha: 0, x: 60, rotation: 6 }, { autoAlpha: 1, x: 0, rotation: -2, duration: 0.35, ease: 'back.out(1.6)' }, 0.75)
        near.fromTo(q('.hx-sc__result'), { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.18 }, 1.05)
        near.fromTo(q('.hx-sc__walk-fill'), { scaleX: 0 }, { scaleX: 1, duration: 0.4, stagger: 0.18, ease: 'power1.inOut' }, 1.2)
        near.to({}, { duration: 0.4 })

        // ── 02: the bill prints out of its slot, line by line, the electricity line is ringed ──
        const price = scene('price', 'top 35%')
        price.fromTo(q('.hx-sc__bill'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% -8% 0%)', duration: 1.2, ease: 'none' }, 0)
        price.fromTo(q('.hx-sc__bill'), { y: -120 }, { y: 0, duration: 1.2, ease: 'none' }, 0)
        price.fromTo(q('.hx-sc__bill-row'), { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.18, stagger: 0.18 }, 0.15)
        price.fromTo(q('.hx-sc__bill-row--hot'), { '--hot': 0 }, { '--hot': 1, duration: 0.3, ease: 'none' }, 1.25)
        price.fromTo(q('.hx-sc__stamp'), { autoAlpha: 0, scale: 1.8, rotation: -24 }, { autoAlpha: 1, scale: 1, rotation: -8, duration: 0.25, ease: 'back.out(2)' }, 1.5)
        price.to({}, { duration: 0.4 })

        // ── 03 (pinned): three face-down cards flip one by one and fan out ──────
        const verify = scene('verify', 'top top')
        // The cards' resting places are their CSS slots (a row, or a column on phones); they start
        // stacked face-down on the middle slot and each flips and slides out to its own place.
        const cards = q('.hx-sc__card')
        const mid = cards[1]
        cards.forEach((card, i) => {
          const at = i * 0.7
          verify.fromTo(card, {
            x: () => mid.offsetLeft - card.offsetLeft,
            y: () => mid.offsetTop - card.offsetTop + i * -10,
            rotationY: 180, rotationZ: (i - 1) * -5, zIndex: 3 - i,
          }, { x: 0, y: 0, rotationY: 0, rotationZ: 0, duration: 0.6, ease: 'power2.inOut' }, at)
          verify.fromTo(card.querySelector('.hx-sc__tick path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.25, ease: 'none' }, at + 0.5)
        })
        verify.fromTo(q('.hx-sc__verify-note'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 2.1)
        verify.to({}, { duration: 0.5 })

        // ── 04: a hand sweeps the 24-hour dial, drawing both days; shared stretches light up ──
        const share = scene('share', 'top 30%')
        const SWEEP = 1.6
        const readout = one('.hx-dd__time')
        const hour = { h: DAY_FROM }
        share.fromTo(one('.hx-dd__hand'), { rotation: dialAngle(DAY_FROM), svgOrigin: '160 160' }, { rotation: dialAngle(DAY_TO), svgOrigin: '160 160', duration: SWEEP, ease: 'none' }, 0)
        share.fromTo(one('.hx-dd__hand'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.12 }, SWEEP)
        share.fromTo(hour, { h: DAY_FROM }, { h: DAY_TO, duration: SWEEP, ease: 'none', onUpdate: () => { readout.textContent = clock(hour.h) } }, 0)
        q('.hx-dd__arc').forEach(path => {
          share.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: Number(path.dataset.len) * SWEEP, ease: 'none' }, Number(path.dataset.at) * SWEEP)
        })
        const shared = q('.hx-dd__shared')
        const listed = q('.hx-dd__list li')
        SHARED.forEach((s, i) => {
          share.fromTo([shared[i], listed[i]], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, sweep(s.to) * SWEEP)
        })
        share.fromTo(listed[3], { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.15 }, SWEEP + 0.02)
        share.fromTo(q('.hx-dd__match'), { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, SWEEP + 0.1)
        const tally = { n: 0 }
        const count = one('.hx-dd__count')
        share.fromTo(tally, { n: 0 }, { n: 4, duration: 0.3, ease: 'none', onUpdate: () => { count.textContent = String(Math.round(tally.n)) } }, SWEEP + 0.1)
        share.to({}, { duration: 0.4 })

        // ── 05: one lit window in the dark grows until its light is the whole screen ──
        const home = scene('home', 'top top')
        // a small square-ish window on any screen: narrower insets on tall phone screens
        home.fromTo(q('.hx-sc__window'), { clipPath: () => (window.innerWidth < 768 ? 'inset(40% 30% 40% 30% round 10px)' : 'inset(36% 43% 36% 43% round 10px)') }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power2.in' }, 0)
        home.fromTo(q('.hx-sc__window-bars'), { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 2.4, duration: 0.6, ease: 'power2.in' }, 0.1)
        home.fromTo(q('.hx-sc__home-intro'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25 }, 0)
        home.fromTo(q('.hx-sc__home-copy'), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.85)
        home.fromTo(q('.hx-sc__rays'), { rotation: -18, scale: 0.6, autoAlpha: 0 }, { rotation: 14, scale: 1.2, autoAlpha: 1, duration: 1.1, ease: 'none' }, 0)
        home.to({}, { duration: 0.5 })

        // ── Details that follow the scroll ─────────────────────────────────
        // Giant chapter numerals drift behind the content, each chapter in its own direction.
        const DRIFT: Record<string, [number, number]> = { near: [-10, 28], price: [10, -28], verify: [0, 36], share: [-12, -24] }
        q('.hx-sc__num').forEach(num => {
          const section = num.closest('.hx-sc__sec') as HTMLElement
          const [x, y] = DRIFT[section.dataset.chapter ?? ''] ?? [0, 30]
          gsap.fromTo(num, { xPercent: -x, yPercent: -y }, { xPercent: x, yPercent: y, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1 } })
        })
        // 01: the band of areas slides sideways as the visitor scrolls (the row holds the list twice).
        gsap.fromTo(q('.hx-sc__ticker-row'), { xPercent: 0 }, { xPercent: -50, ease: 'none', scrollTrigger: { trigger: sec('near'), start: 'top bottom', end: 'bottom top', scrub: 1 } })
        near.fromTo(q('.hx-sc__note--walk'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 1.5)
        // 02: every amount counts up as its line prints; a note points at the electricity line.
        q('.hx-sc__amount').forEach((amount, i) => {
          const to = Number(amount.dataset.to)
          const value = { n: 0 }
          price.fromTo(value, { n: 0 }, { n: to, duration: 0.3, ease: 'power1.out', onUpdate: () => { amount.textContent = money(value.n) } }, 0.15 + i * 0.18)
        })
        price.fromTo(q('.hx-sc__note-line'), { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: 'none' }, 1.3)
        price.fromTo(q('.hx-sc__note--power'), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.2 }, 1.42)
        // 03: once the cards are out, a thread ties them in order.
        verify.fromTo(q('.hx-sc__thread'), { '--t': 0 }, { '--t': 1, duration: 0.45, ease: 'none' }, 1.75)
      }, root)
      cleanup = () => {
        ctx.revert()
        if (bar) { delete bar.dataset.story; delete bar.dataset.step; bar.style.removeProperty('--story') }
        root.querySelectorAll<HTMLElement>('.hx-sc__typed > span').forEach(letter => letter.style.removeProperty('display'))
      }
      ScrollTrigger.refresh()
    })
    return () => {
      alive = false
      cleanup()
    }
  }, [phone])

  return (
    <div ref={rootRef} className="hx-sc">
      <section className="hx-sc__hero" aria-labelledby="hx-hero-title">
        <div className="hx-sc__layers" aria-hidden="true">
          <img className="hx-sc__layer hx-sc__layer--sky" src={`${IMG}/sky.webp`} alt="" decoding="async" width={1536} height={864} />
          <img className="hx-sc__layer hx-sc__layer--lane" src={`${IMG}/lane.webp`} alt="" decoding="async" fetchPriority="high" width={1536} height={864} />
          <img className="hx-sc__layer hx-sc__layer--fore" src={`${IMG}/fore.webp`} alt="" decoding="async" width={1536} height={864} />
        </div>
        <div className="hx-sc__shade" aria-hidden="true" />
        <div className="hx-sc__hero-copy">
          <h1 id="hx-hero-title" className="hx-sc__h1"><span>Trọ an tâm.</span> <span><em>Nâng tầm cuộc sống.</em></span></h1>
          <p className="hx-sc__sub">Phòng trọ quanh trường đã qua 3 bước xác minh, giá ghi đủ từng khoản.</p>
          <div className="hx-sc__actions">
            <ButtonLink to="#tin-noi-bat" variant="accent" size="lg" trailingIcon={<ArrowRight aria-hidden="true" />} onClick={event => jumpTo(event, 'tin-noi-bat')}>
              Tìm phòng ngay
            </ButtonLink>
            <a className="hx-sc-link" href="#xac-minh" onClick={event => jumpTo(event, 'xac-minh')}>Xem cách xác minh</a>
          </div>
        </div>
        <p className="hx-sc__hint" aria-hidden="true"><ArrowDown />Cuộn để xem</p>
      </section>

      {phone ? <PhoneStory actions={actions} /> : (
      <>
      {/* 01 · kinetic type: the search writes itself across the screen */}
      <section className="hx-sc__sec hx-sc__sec--near" data-chapter="near" aria-labelledby="hx-sc-h-near">
        <div className="hx-sc__frame">
          <span className="hx-sc__num" aria-hidden="true">01</span>
          <div className="hx-sc__ticker" aria-hidden="true">
            <div className="hx-sc__ticker-row">{[...AREAS, ...AREAS].map((area, i) => <span key={i}>{area}</span>)}</div>
          </div>
          <div className="hx-sc__copy">
            <Kicker n={1}>Tìm theo trường</Kicker>
            <h2 id="hx-sc-h-near" className="hx-sc__h2">Gần trường, đúng túi tiền.</h2>
            <p className="hx-sc__line">Chọn khu vực và mức giá, Homeji chỉ hiện phòng trong tầm đi bộ tới trường.</p>
            <SearchForm actions={actions} />
          </div>
          <figure className="hx-sc__finder" aria-label="Ví dụ một lượt tìm">
            <p className="hx-sc__query" aria-hidden="true">
              <Search />
              <span className="hx-sc__typed">{[...QUERY].map((c, i) => <span key={i}>{c}</span>)}</span>
              <span className="hx-sc__caret" />
            </p>
            <span className="hx-sc__filter">≤ 2,5 triệu · Thủ Đức</span>
            <ul className="hx-sc__results">
              {RESULTS.map((room, i) => (
                <li key={room.title} className="hx-sc__result">
                  <div>
                    <strong>{room.title}</strong>
                    <span>{room.where}</span>
                  </div>
                  <div className="hx-sc__walk"><span className="hx-sc__walk-fill" />{i === 0 && <span className="hx-sc__note hx-sc__note--walk">Thời gian đi bộ tới trường</span>}{room.walk}</div>
                  <b>{room.price}</b>
                </li>
              ))}
            </ul>
            <figcaption>Minh họa</figcaption>
          </figure>
        </div>
      </section>

      {/* 02 · a bill unrolls: every fee on its own line */}
      <section className="hx-sc__sec hx-sc__sec--price" data-chapter="price" aria-labelledby="hx-sc-h-price">
        <div className="hx-sc__frame">
          <span className="hx-sc__num" aria-hidden="true">02</span>
          <div className="hx-sc__printer">
          <div className="hx-sc__slot" aria-hidden="true" />
          <figure className="hx-sc__bill" aria-label="Ví dụ cách một tin ghi giá">
            <figcaption>Ví dụ · Phòng 16 m², Linh Trung</figcaption>
            <dl>
              {BILL.map(line => (
                <div key={line.label} className={line.hot ? 'hx-sc__bill-row hx-sc__bill-row--hot' : 'hx-sc__bill-row'}>
                  <dt>{line.label}</dt>
                  <dd><span className="hx-sc__amount" data-to={line.amount}>{money(line.amount)}</span><small>{line.note}</small></dd>
                  {line.hot && <span className="hx-sc__note hx-sc__note--power" aria-hidden="true"><i className="hx-sc__note-line" />Điện tính theo kWh, ghi rõ trên tin</span>}
                </div>
              ))}
            </dl>
            <p className="hx-sc__stamp">Ghi đủ trên tin</p>
          </figure>
          </div>
          <div className="hx-sc__copy">
            <Kicker n={2}>Giá minh bạch</Kicker>
            <h2 id="hx-sc-h-price" className="hx-sc__h2">Giá rõ từng khoản, kể cả điện.</h2>
            <p className="hx-sc__line">Tiền phòng, điện, nước, wifi ghi đủ trên tin, trước khi bạn hẹn xem.</p>
          </div>
        </div>
      </section>

      {/* 03 · pinned: three cards flip and fan out */}
      <section className="hx-sc__sec hx-sc__sec--verify" data-chapter="verify" aria-labelledby="hx-sc-h-verify">
        {/* Links to #xac-minh land late in the chapter, where all three checks are open. */}
        <span id="xac-minh" className="hx-sc__anchor" data-focus="hx-sc-h-verify" aria-hidden="true" />
        <div className="hx-sc__frame">
          <span className="hx-sc__num" aria-hidden="true">03</span>
          <div className="hx-sc__copy hx-sc__copy--center">
            <Kicker n={3}>Xác minh</Kicker>
            <h2 id="hx-sc-h-verify" className="hx-sc__h2" tabIndex={-1}>3 bước xác minh trước khi đăng.</h2>
            <p className="hx-sc__line">Tin lên Homeji sau khi chủ nhà qua đủ ba bước kiểm tra.</p>
          </div>
          <div className="hx-sc__deckwrap">
          <span className="hx-sc__thread" aria-hidden="true" />
          <ol className="hx-sc__deck">
            {CHECKS.map((check, i) => (
              <li key={check.title} className="hx-sc__card">
                <div className="hx-sc__card-back" aria-hidden="true"><span>Bước {i + 1}</span></div>
                <div className="hx-sc__card-face">
                  <span className="hx-sc__card-icon">{check.icon}</span>
                  <strong>
                    <svg className="hx-sc__tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" pathLength={1} /></svg>
                    {check.title}
                  </strong>
                  <p>{check.body}</p>
                </div>
              </li>
            ))}
          </ol>
          </div>
          <p className="hx-sc__verify-note"><Info aria-hidden="true" />Chỉ đặt cọc sau khi đã xem phòng và gặp đúng chủ nhà.</p>
        </div>
      </section>

      {/* 04 · a day in two lives: a clock hand sweeps 6:00 → 23:30 across both schedules */}
      <section className="hx-sc__sec hx-sc__sec--share" data-chapter="share" aria-labelledby="hx-sc-h-share">
        <div className="hx-sc__frame">
          <span className="hx-sc__num" aria-hidden="true">04</span>
          <div className="hx-sc__copy">
            <Kicker n={4}>Ở ghép</Kicker>
            <h2 id="hx-sc-h-share" className="hx-sc__h2">Ở ghép hợp nhịp sống.</h2>
            <p className="hx-sc__line">Tìm bạn cùng trường theo giờ ngủ, nấu ăn, thú cưng và độ yên tĩnh.</p>
            <div className="hx-sc__actions">
              <button type="button" className="hx-sc__pill" onClick={actions.onRoommates}>
                <Users aria-hidden="true" />Tìm bạn ở ghép<ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
          <DayDial />
        </div>
      </section>

      {/* 05 · the lit window opens into the light page */}
      <section className="hx-sc__sec hx-sc__sec--home" data-chapter="home" aria-labelledby="hx-sc-h-home">
        <div className="hx-sc__frame">
          <p className="hx-sc__home-intro"><span aria-hidden="true">05</span>Về phòng</p>
          <div className="hx-sc__rays" aria-hidden="true" />
          <div className="hx-sc__window">
            <div className="hx-sc__window-bars" aria-hidden="true" />
            <div className="hx-sc__home-copy">
              <h2 id="hx-sc-h-home" className="hx-sc__h2">Phòng của bạn đang sáng đèn.</h2>
              <p className="hx-sc__line">Chọn khu vực, xem phòng đã xác minh, hẹn xem rồi mới đặt cọc.</p>
              <div className="hx-sc__actions">
                <ButtonLink to="#tin-noi-bat" variant="accent" size="lg" trailingIcon={<ArrowRight aria-hidden="true" />} onClick={event => jumpTo(event, 'tin-noi-bat')}>
                  Tìm phòng ngay
                </ButtonLink>
                <a className="hx-sc-link" href="#cho-chu-nha" onClick={event => jumpTo(event, 'cho-chu-nha')}>
                  <Megaphone aria-hidden="true" />Có phòng trống? Đăng tin cho thuê
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      </>
      )}
    </div>
  )
}
