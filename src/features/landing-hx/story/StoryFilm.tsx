import { Fragment, memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { BorderBeam } from 'border-beam'
import { ArrowRight, Camera, Flag, IdCard, Megaphone, ReceiptText, Users } from 'lucide-react'
import { STORY } from '../../../lib/mock/homeji'
import { useMediaQuery } from '../motion/useScrollProgress'
import { SearchBar, type ListingQuery } from '../sections/SearchBar'
import { ButtonLink } from '../ui/Button'
import { useTheme } from '../useTheme'
import { currentTheme, THEME_EVENT } from '../../../lib/theme'
import { frameScrollY } from '../frameScroll'
import { isFilmInScene, magneticSnapTarget, rawForFilmProgress, rubberProgress } from './rubberScroll'
import { canDecodeVideo } from './video'
import { FilmPlayer, flareAt, framesAt, frameUrl, playLapse, prefetchLapse, type FilmTime } from './film'
import { SURFACES, fitScene, quadAt, quadMatrix, toView, type Surface } from './surfaces'

/*
 * The landing opens as one film, scrubbed by native scroll while the stage is
 * pinned under the nav: the house at dusk, a walk up to the door, a flash of
 * light as it opens, then the camera visits the corners inside.
 *
 * On landscape screens each corner's content is laid onto the scene itself: a
 * stretch of wall, the table with the three objects, the tea table top. It is
 * real HTML mapped into the camera's perspective (see surfaces.ts), so it
 * stays readable and clickable and moves with the room. Portrait phones crop
 * the frame too tightly for that and get a sheet at the bottom instead.
 * Reduced motion gets the scenes as stills in the flow.
 */

/** Scroll length of the film, in viewport heights. */
const FILM_VH = 1550

const CHECKS: { icon: ReactNode; title: string; body: string; at: number }[] = [
  {
    icon: <IdCard />,
    title: 'Đúng người có quyền cho thuê',
    at: 0.43,
    body: 'Homeji đối chiếu CCCD gắn chip của người đăng. Nếu họ quản lý thay chủ nhà, tin cần thêm hợp đồng ủy quyền hợp lệ.',
  },
  {
    icon: <Camera />,
    title: 'Ảnh chụp đúng căn phòng',
    at: 0.47,
    body: 'Ảnh được đối chiếu tận nơi hoặc qua video kiểm duyệt. Không nhận ảnh dựng 3D làm phòng trông rộng hơn thực tế.',
  },
  {
    icon: <ReceiptText />,
    title: 'Giá ghi đủ từng khoản',
    at: 0.51,
    body: 'Tiền thuê, tiền cọc, điện, nước, internet, gửi xe và phí dịch vụ đều hiện trên tin, để bạn tính trước khi đi xem.',
  },
]

const REPORT = (
  <>
    <strong>Thấy điều gì không đúng?</strong> Bị đòi chuyển cọc trước khi xem phòng, phòng đã cho thuê, sai giá hay ảnh khác thực tế: bấm “Báo cáo tin này” trên trang tin.
  </>
)

type Scene = {
  id: string
  /** Scroll progress where the scene's content shows and hides. */
  from: number
  to: number
  side: 'left' | 'right'
  /** The frame that stands for this scene when motion is reduced. */
  still: number
  alt: string
}

const SCENES: Scene[] = [
  { id: 'vi-sao', from: 0.275, to: 0.355, side: 'right', still: 211, alt: 'Góc học tập trong nhà: bàn gỗ, máy tính, đèn bàn, ghế nhựa và kệ sách sắt, đồng hồ trên tường.' },
  { id: 'xac-minh', from: 0.415, to: 0.535, side: 'left', still: 251, alt: 'Bàn gỗ sát tường với bìa kẹp hồ sơ, máy ảnh và kính lúp.' },
  { id: 'tim-phong', from: 0.595, to: 0.675, side: 'left', still: 291, alt: 'Mảng tường giữa cửa sổ và cửa ra vào, ngoài kia là hàng cây lúc hoàng hôn.' },
  { id: 'o-ghep', from: 0.735, to: 0.83, side: 'right', still: 331, alt: 'Hai ghế bành đối diện nhau, ở giữa là bàn trà có ấm trà.' },
  { id: 've-nha', from: 0.875, to: 1.01, side: 'left', still: 411, alt: 'Căn phòng trên lầu vừa dọn vào: ghế bành, vali, chậu cây, chồng thùng giấy với đèn bàn.' },
]

/** How far either side of its scene a surface is still placed (its words fade in and out there). */
const SCENE_NEAR = 0.05

function ChapterKicker({ index, suffix }: { index: number; suffix?: string }) {
  return (
    <p className="hx-film__kicker">
      Chặng {index + 1}/{STORY.length}
      {suffix ? ` · ${suffix}` : ''}
    </p>
  )
}

function HomeActions({ className = '' }: { className?: string }) {
  const [theme] = useTheme()
  const reduce = useReducedMotion()
  return (
    <div className={`hx-film__actions ${className}`}>
      <BorderBeam
        size="sm"
        colorVariant="sunset"
        theme={theme}
        strength={0.65}
        borderRadius={999}
        active={!reduce}
      >
        <ButtonLink to="#tin-noi-bat" variant="accent" size="lg" trailingIcon={<ArrowRight aria-hidden="true" />}>
          Tìm phòng ngay
        </ButtonLink>
      </BorderBeam>
      <ButtonLink to="/posts/new" variant="outline" size="lg" icon={<Megaphone aria-hidden="true" />} className="hx-film__ghost">
        Đăng tin cho thuê
      </ButtonLink>
    </div>
  )
}

function RoommateButton({ onRoommates }: { onRoommates: () => void }) {
  return (
    <button type="button" className="hx-btn hx-btn--outline hx-btn--lg hx-film__ghost" onClick={onRoommates}>
      <Users aria-hidden="true" />
      <span className="hx-btn__label">Tìm bạn ở ghép</span>
    </button>
  )
}

/** The slogan, word by word: each word rises out of its line when the page opens. */
function Slogan() {
  let i = 0
  const words = (line: string) =>
    line.split(' ').map(word => {
      const index = i++
      // The space sits between the inline-blocks, so it keeps its width.
      return (
        <Fragment key={word}>
          <span className="hx-film__word" style={{ '--i': index } as CSSProperties}>{word}</span>{' '}
        </Fragment>
      )
    })
  return (
    <h1 id="hx-hero-title" className="hx-film__slogan" aria-label="Trọ an tâm. Nâng tầm cuộc sống.">
      <span className="hx-film__line" aria-hidden="true">{words('Trọ an tâm.')}</span>
      <span className="hx-film__line hx-film__line--2" aria-hidden="true">{words('Nâng tầm cuộc sống.')}</span>
    </h1>
  )
}

type Actions = { onSearch: (query: ListingQuery) => void; onRoommates: () => void }

/* ---------- Sheet / stacked content: one block per scene ---------- */

function SceneBlock({ id, checksOn, actions }: { id: string; checksOn: number; actions: Actions }) {
  switch (id) {
    case 'vi-sao':
      return (
        <>
          <h2 className="hx-film__kicker">Tại sao chọn Homeji?</h2>
          <p className="hx-film__h2">Thuê trọ ở thành phố mới không nên là một canh bạc.</p>
          <div className="hx-film__chapter">
            <ChapterKicker index={0} />
            <h3 className="hx-film__h3">{STORY[0].title}</h3>
            <p className="hx-film__body">{STORY[0].body}</p>
          </div>
        </>
      )
    case 'xac-minh':
      return (
        <>
          <h2 className="hx-film__h2">Huy hiệu “Chủ nhà đã xác minh” nghĩa là gì?</h2>
          <p className="hx-film__body">Mọi tin có huy hiệu này đã qua ba bước kiểm tra của đội kiểm duyệt Homeji trước khi hiển thị.</p>
          <ol className="hx-film__checks">
            {CHECKS.map((check, index) => (
              <li key={check.title} className={index < checksOn ? 'is-on' : undefined}>
                <span className="hx-film__check-icon" aria-hidden="true">{check.icon}</span>
                <span>
                  <strong><span className="hx-sr-only">Bước {index + 1}: </span>{check.title}</strong>
                  <span className="hx-film__check-body">{check.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="hx-film__report"><Flag aria-hidden="true" /><span>{REPORT}</span></p>
        </>
      )
    case 'tim-phong':
      return (
        <>
          <ChapterKicker index={1} />
          <h2 className="hx-film__h2 hx-film__h2--sm">{STORY[1].title}</h2>
          <p className="hx-film__body">{STORY[1].body}</p>
          <div className="hx-film__search"><SearchBar onSearch={actions.onSearch} stacked /></div>
        </>
      )
    case 'o-ghep':
      return (
        <>
          <ChapterKicker index={2} />
          <h2 className="hx-film__h2 hx-film__h2--sm">{STORY[2].title}</h2>
          <p className="hx-film__body">{STORY[2].body}</p>
          <div className="hx-film__actions"><RoommateButton onRoommates={actions.onRoommates} /></div>
        </>
      )
    default:
      return (
        <>
          <ChapterKicker index={3} suffix={STORY[3].title} />
          <h2 className="hx-film__h2">Tổ ấm tiếp theo của bạn đang chờ.</h2>
          <p className="hx-film__body">{STORY[3].body}</p>
          <HomeActions />
        </>
      )
  }
}

/* ---------- In-world content: what is laid on each surface ---------- */

/** CSS width of each surface's box; its height follows the surface's proportions. */
const SURFACE_PX: Record<string, number> = {
  why: 560,
  'trust-title': 1240,
  'trust-1': 400,
  'trust-2': 400,
  'trust-3': 400,
  find: 430,
  'match-cta': 240,
  home: 560,
}

function SurfaceContent({ id, checksOn, actions }: { id: string; checksOn: number; actions: Actions }) {
  switch (id) {
    case 'why':
      return (
        <>
          <h2 className="hx-wall__kicker">Tại sao chọn Homeji?</h2>
          <p className="hx-wall__h2">Thuê trọ ở thành phố mới không nên là một canh bạc.</p>
          <div className="hx-wall__rule" />
          <ChapterKicker index={0} />
          <h3 className="hx-wall__h3">{STORY[0].title}</h3>
          <p className="hx-wall__body">{STORY[0].body}</p>
        </>
      )
    case 'trust-title':
      return (
        <>
          <h2 className="hx-wall__h2 hx-wall__h2--line">Huy hiệu “Chủ nhà đã xác minh” nghĩa là gì?</h2>
          <p className="hx-wall__body hx-wall__body--wide">Mọi tin có huy hiệu này đã qua ba bước kiểm tra của đội kiểm duyệt Homeji trước khi hiển thị.</p>
        </>
      )
    case 'trust-1':
    case 'trust-2':
    case 'trust-3': {
      const index = Number(id.slice(-1)) - 1
      const check = CHECKS[index]
      return (
        <div className={`hx-wall__check${index < checksOn ? ' is-on' : ''}`}>
          <p className="hx-wall__step" aria-hidden="true">{index + 1}</p>
          <h3 className="hx-wall__check-title"><span className="hx-sr-only">Bước {index + 1}: </span>{check.title}</h3>
          <p className="hx-wall__check-body">{check.body}</p>
        </div>
      )
    }
    case 'find':
      return (
        <>
          <ChapterKicker index={1} />
          <h2 className="hx-wall__h2 hx-wall__h2--sm">{STORY[1].title}</h2>
          <p className="hx-wall__body">{STORY[1].body}</p>
          <div className="hx-wall__search"><SearchBar onSearch={actions.onSearch} stacked /></div>
        </>
      )
    case 'match-cta':
      return (
        <div className="hx-teacard">
          <ChapterKicker index={2} />
          <h2 className="hx-teacard__title">{STORY[2].title}</h2>
          <p className="hx-teacard__body">{STORY[2].body}</p>
          <button type="button" className="hx-teacard__button" onClick={actions.onRoommates}>
            <Users aria-hidden="true" />
            Tìm bạn ở ghép
          </button>
        </div>
      )
    default:
      return (
        <div className="hx-wall__home">
          <div>
            <ChapterKicker index={3} suffix={STORY[3].title} />
            <h2 className="hx-wall__h2 hx-wall__h2--sm">Tổ ấm tiếp theo của bạn đang chờ.</h2>
            <p className="hx-wall__body">{STORY[3].body}</p>
          </div>
          <div>
            <HomeActions className="hx-wall__actions" />
          </div>
        </div>
      )
  }
}

/* ---------- Reduced motion ---------- */

/** A still of the film for this theme; a night still that is not there yet shows the day one. */
function Still({ frame, time, ...rest }: { frame: number; time: FilmTime } & ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...rest}
      key={`${time}-${frame}`}
      src={frameUrl(frame, time)}
      onError={event => {
        const day = frameUrl(frame)
        if (!event.currentTarget.src.endsWith(day)) event.currentTarget.src = day
      }}
    />
  )
}

/** The film's opening still, shown until the first frame is drawn on the canvas. */
function Poster() {
  const [theme] = useTheme()
  return <Still frame={1} time={theme === 'dark' ? 'night' : 'day'} alt="" className="hx-film__poster" fetchPriority="high" />
}

function filmTime(): FilmTime {
  return currentTheme() === 'dark' ? 'night' : 'day'
}

function StaticStory({ actions }: { actions: Actions }) {
  const [theme] = useTheme()
  const time: FilmTime = theme === 'dark' ? 'night' : 'day'
  return (
    <section className="hx-film is-static" aria-labelledby="hx-hero-title">
      <div className="hx-film__hero">
        <Still frame={1} time={time} alt="Một tòa nhà trọ ba tầng giữa hàng cây, cửa sổ nào cũng sáng đèn." className="hx-film__still" />
        <Slogan />
      </div>
      {SCENES.map(scene => (
        <article key={scene.id} id={scene.id} className="hx-film__scene">
          <Still frame={scene.still} time={time} alt={scene.alt} loading="lazy" className="hx-film__still" />
          <div className="hx-film__panel">
            <SceneBlock id={scene.id} checksOn={CHECKS.length} actions={actions} />
          </div>
        </article>
      ))}
    </section>
  )
}

export function StoryFilm({ onSearch, onRoommates }: Actions) {
  const reduce = useReducedMotion()
  const actions = useMemo(() => ({ onSearch, onRoommates }), [onSearch, onRoommates])
  // The film is one video decoded frame by frame (WebCodecs); without it, the stills.
  if (reduce || !canDecodeVideo()) return <StaticStory actions={actions} />
  return <PinnedStory actions={actions} />
}

/*
 * The film re-renders when the scene, a check or the phone layout changes as the reader scrolls; the
 * scenes' content only changes with its own checks, so it is kept out of those renders (memo, and each
 * scene gets the check count only if it shows the checks).
 */
const SceneView = memo(SceneBlock)
const SurfaceView = memo(SurfaceContent)
const SloganView = memo(Slogan)

/* ---------- The pinned film ---------- */

/** Every frame a scene's content is on screen for. */
function sceneFrames(scene: Scene) {
  const frames = new Set<number>()
  for (let p = scene.from; p <= Math.min(1, scene.to); p += 0.002) {
    const [a, b] = framesAt(p)
    frames.add(a)
    frames.add(b)
  }
  return [...frames].sort((x, y) => x - y)
}

function PinnedStory({ actions }: { actions: Actions }) {
  // In-world content needs a landscape stage wide enough to read it.
  const world = useMediaQuery('(min-width: 900px) and (min-aspect-ratio: 5/4)')
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // On a theme change the old picture holds here and fades out (or plays the sunset/sunrise) over the new one.
  const shiftRef = useRef<HTMLCanvasElement>(null)
  // The film follows the theme without re-rendering the story: a theme change swaps the player's
  // film in place (the THEME_EVENT effect below), so the toggle never waits on a React render here.
  const lastTime = useRef<FilmTime>(filmTime())
  const playerRef = useRef<FilmPlayer | null>(null)
  const surfaceRefs = useRef(new Map<string, HTMLElement>())
  // One ref callback per surface for the life of the film: a new callback on each render would make
  // React detach and re-attach every surface (and re-place it) whenever a scene or check changes.
  const [surfaceRefCallbacks] = useState(() =>
    new Map(
      SURFACES.map(surface => [
        surface.id,
        (node: HTMLElement | null) => {
          if (node) surfaceRefs.current.set(surface.id, node)
          else surfaceRefs.current.delete(surface.id)
          placed.current.delete(surface.id)
        },
      ]),
    ),
  )
  const [painted, setPainted] = useState(false)
  const [active, setActive] = useState(-1)
  const [checksOn, setChecksOn] = useState(0)
  const [inside, setInside] = useState(false)

  const heroRef = useRef<HTMLDivElement>(null)
  const flareRef = useRef<HTMLDivElement>(null)
  // Layout numbers, measured on mount and resize only, so a scroll frame never forces layout.
  const geo = useRef({ stageTop: 0, track: 1, width: 0, height: 0 })
  const shown = useRef({ active: -1, checks: 0, inside: false })
  // Each scene's surfaces, fitted to the visible part of the frame (see fitScene).
  const fitted = useRef(new Map<string, Surface>())
  const written = useRef('')
  const placed = useRef(new Map<string, string>())

  const remeasure = useCallback(() => {
    const section = sectionRef.current
    const stage = section?.firstElementChild as HTMLElement | null
    if (!section || !stage) return
    geo.current = {
      stageTop: parseFloat(getComputedStyle(stage).top) || 0,
      track: Math.max(1, section.offsetHeight - stage.offsetHeight),
      width: stage.clientWidth,
      height: stage.clientHeight,
    }
    const { width, height } = geo.current
    // Keep clear of the bar (it comes back on any scroll up) and of the screen edges.
    const nav = parseFloat(getComputedStyle(section).getPropertyValue('--hx-nav-h')) || 72
    const side = Math.max(24, width * 0.03)
    const margin = { top: nav + 20, right: side, bottom: Math.max(24, height * 0.04), left: side }
    fitted.current.clear()
    for (const scene of SCENES) {
      const group = SURFACES.filter(surface => surface.scene === scene.id)
      for (const surface of fitScene(group, sceneFrames(scene), width, height, margin)) fitted.current.set(surface.id, surface)
    }
  }, [])

  /** Scroll progress through the pinned stretch, 0..1. One layout read, before any write. */
  const measure = useCallback(() => {
    const section = sectionRef.current
    if (!section) return 0
    const { stageTop, track } = geo.current
    return Math.min(1, Math.max(0, (stageTop - section.getBoundingClientRect().top) / track))
  }, [])

  const placeSurfaces = useCallback((p: number) => {
    // Follow the picture as drawn (eased, see FilmPlayer), not the raw scroll position.
    const [a, b, t] = playerRef.current?.visual() ?? framesAt(p)
    const { width, height } = geo.current
    for (const base of SURFACES) {
      const surface = fitted.current.get(base.id) ?? base
      const el = surfaceRefs.current.get(surface.id)
      if (!el) continue
      // Only the scene on screen (and the stretch either side where it fades) is placed; the
      // others stay hidden and cost nothing while the reader scrolls past.
      const scene = SCENES.find(item => item.id === surface.scene)
      const near = !scene || (p > scene.from - SCENE_NEAR && p < scene.to + SCENE_NEAR)
      // Across a cut (door → study, downstairs → upstairs) there is no one camera to follow.
      const quad = near && Math.abs(a - b) <= 2 ? quadAt(surface, a, b, t) : null
      const boxW = SURFACE_PX[surface.id]
      const boxH = Math.round((boxW * surface.h) / surface.w)
      const matrix = quad ? quadMatrix(boxW, boxH, toView(quad, width, height)) : null
      // Write only what changed: every style write restyles the surface's subtree.
      const next = matrix ?? 'hidden'
      if (placed.current.get(surface.id) === next) continue
      if (matrix) {
        el.style.transform = matrix
        if (placed.current.get(surface.id) === 'hidden' || !placed.current.has(surface.id)) el.style.visibility = ''
      } else {
        el.style.visibility = 'hidden'
      }
      placed.current.set(surface.id, next)
    }
  }, [])

  // The last scroll progress the film was placed at: the easing step reuses it rather than measuring
  // again after this frame's style writes, which would force a second restyle.
  const lastProgress = useRef(0)
  const springRef = useRef({
    p: 0,
    v: 0,
    targetRaw: 0,
    targetP: 0,
    raf: 0,
    lastTime: 0,
    wheelIdleTimer: 0,
  })

  const applyProgress = useCallback((p: number, kickPx = 0) => {
    lastProgress.current = p
    // Only the layers that use them get the scroll variables; the rest of the film is untouched.
    // Each write restyles the layer's whole subtree, so write only when the value moves: the
    // hero is gone by p = 0.06 and the flare is 0 outside the door.
    const hero = Math.min(p, 0.06).toFixed(4)
    const flare = flareAt(p).toFixed(3)
    const kick = kickPx.toFixed(1)
    const vars = `${hero}|${flare}|${kick}`
    if (vars !== written.current) {
      heroRef.current?.style.setProperty('--p', hero)
      sectionRef.current?.style.setProperty('--rubber-kick', `${kick}px`)
      // With WebGL the player draws the flare into the picture; the page layer is only the fallback.
      if (!playerRef.current?.drawsFlare) flareRef.current?.style.setProperty('--flare', flare)
      written.current = vars
    }
    playerRef.current?.setFlare(Number(flare), geo.current.width, geo.current.height)
    playerRef.current?.setProgress(p)
    placeSurfaces(p)
    // React only hears about it when a scene or a check actually changes.
    const next = {
      active: SCENES.findIndex(scene => p >= scene.from && p < scene.to),
      checks: CHECKS.filter(check => p >= check.at).length,
      // Past the door: on phones the picture moves up and the content takes the lower part.
      inside: p >= 0.232,
    }
    const last = shown.current
    if (next.active !== last.active) setActive(next.active)
    if (next.checks !== last.checks) setChecksOn(next.checks)
    if (next.inside !== last.inside) setInside(next.inside)
    shown.current = next
  }, [placeSurfaces])

  const syncImmediate = useCallback(() => {
    frameScrollY()
    const raw = measure()
    const p = rubberProgress(raw)
    const spring = springRef.current
    cancelAnimationFrame(spring.raf)
    spring.raf = 0
    window.clearTimeout(spring.wheelIdleTimer)
    spring.wheelIdleTimer = 0
    spring.targetRaw = raw
    spring.targetP = p
    spring.p = p
    spring.v = 0
    applyProgress(p, 0)
  }, [applyProgress, measure])

  // One player for the life of the film; a theme change swaps its film in place (the effect below),
  // so the renderer, the depth maps and the decoded neighbours are never rebuilt.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    const spring = springRef.current
    const player = new FilmPlayer(canvas, () => setPainted(true), lastTime.current)
    playerRef.current = player
    if (import.meta.env.DEV) (window as unknown as { __film?: FilmPlayer }).__film = player
    player.onAnimate = () => placeSurfaces(lastProgress.current)
    if (player.drawsFlare && flareRef.current) flareRef.current.hidden = true
    remeasure()
    player.start()
    syncImmediate()
    // Once the page is idle, fetch the other time of day (and, near the top, its time-lapse),
    // so a theme change plays at once.
    const idle = window.setTimeout(() => {
      if (cancelled) return
      const other = lastTime.current === 'day' ? 'night' : 'day'
      player.prefetch(other)
      if (measure() < 0.05) prefetchLapse(other === 'night' ? 'sunset' : 'sunrise').catch(() => {})
    }, 5000)

    const stepSpring = (now: number) => {
      spring.raf = 0
      if (cancelled) return
      const dt = Math.min(0.032, Math.max(0.001, (now - spring.lastTime) / 1000))
      spring.lastTime = now
      const inScene = isFilmInScene(spring.p) || isFilmInScene(spring.targetP)
      // Underdamped rubber braking inside scenes; snappy follow between scenes.
      const omega = inScene ? 19 : 28
      const zeta = inScene ? 0.56 : 0.85
      const h = dt * 0.5
      for (let step = 0; step < 2; step += 1) {
        const acc = (spring.targetP - spring.p) * omega * omega - 2 * zeta * omega * spring.v
        spring.v += acc * h
        spring.p = Math.min(1, Math.max(0, spring.p + spring.v * h))
      }
      if (Math.abs(spring.targetP - spring.p) < 0.00025 && Math.abs(spring.v) < 0.0005) {
        spring.p = spring.targetP
        spring.v = 0
        applyProgress(spring.p, 0)
        return
      }
      const kick = Math.max(-18, Math.min(18, -spring.v * 18))
      applyProgress(spring.p, kick)
      spring.raf = requestAnimationFrame(stepSpring)
    }

    const startSpring = () => {
      if (spring.raf) return
      spring.lastTime = performance.now()
      spring.raf = requestAnimationFrame(stepSpring)
    }

    let queued = 0
    const onScroll = () => {
      if (queued) return
      queued = requestAnimationFrame(() => {
        queued = 0
        if (cancelled) return
        frameScrollY()
        const raw = measure()
        spring.targetRaw = raw
        spring.targetP = rubberProgress(raw)
        window.clearTimeout(spring.wheelIdleTimer)
        spring.wheelIdleTimer = window.setTimeout(() => {
          if (cancelled) return
          const snappedRaw = magneticSnapTarget(spring.targetRaw)
          spring.targetP = rubberProgress(snappedRaw)
          if (Math.abs(spring.targetP - spring.p) >= 0.00025) startSpring()
        }, 110)
        startSpring()
      })
    }
    const onResize = () => {
      remeasure()
      syncImmediate()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.clearTimeout(idle)
      window.clearTimeout(spring.wheelIdleTimer)
      cancelAnimationFrame(spring.raf)
      spring.raf = 0
      player.stop()
      playerRef.current = null
      cancelAnimationFrame(queued)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [applyProgress, measure, placeSurfaces, remeasure, syncImmediate])

  // The theme changed: hold the old picture on the shift canvas while the player swaps films.
  useLayoutEffect(() => {
    let stopLast = () => {}
    const onTheme = () => {
      const time = filmTime()
      const from = lastTime.current
      lastTime.current = time
      const canvas = canvasRef.current
      const shift = shiftRef.current
      const player = playerRef.current
      if (from === time || !canvas || !player) return
      // A newer change takes over from one still playing.
      stopLast()
      let cancelled = false
      stopLast = () => {
        cancelled = true
      }
      const holding = !!shift && canvas.width > 0
      if (shift && holding) {
        shift.width = canvas.width
        shift.height = canvas.height
        shift.getContext('2d', { alpha: false })?.drawImage(canvas, 0, 0)
        shift.classList.add('is-on')
      }
      const repainted = player.setTime(time)
      if (!shift || !holding) return
      // On the opening shot the sun sets in the west (to dark) or rises in the east (to light);
      // anywhere else, or if the time-lapse is not there, the old picture simply fades out.
      const lapse = measure() < 0.02
        ? prefetchLapse(time === 'night' ? 'sunset' : 'sunrise').then(video => playLapse(shift, video, 2400, () => cancelled))
        : Promise.resolve()
      void lapse
        .catch(() => {})
        .then(() => repainted)
        .then(() => {
          if (!cancelled) shift.classList.remove('is-on')
        })
    }
    window.addEventListener(THEME_EVENT, onTheme)
    return () => {
      stopLast()
      window.removeEventListener(THEME_EVENT, onTheme)
    }
  }, [measure])

  // Surfaces mount when the layout switches to world mode: place them straight away.
  useLayoutEffect(() => {
    if (world) placeSurfaces(rubberProgress(measure()))
  }, [world, measure, placeSurfaces])

  // Keyboard and screen-reader users reach a scene's content by focus: bring the scene up.
  const reveal = useCallback((scene: Scene) => {
    const section = sectionRef.current
    const p = rubberProgress(measure())
    if (!section || (p >= scene.from && p < scene.to)) return
    const { stageTop, track } = geo.current
    const top = section.getBoundingClientRect().top + window.scrollY
    const targetRaw = rawForFilmProgress((scene.from + scene.to) / 2)
    window.scrollTo({ top: top - stageTop + targetRaw * track, behavior: 'auto' })
  }, [measure])

  return (
    <section ref={sectionRef} className={`hx-film${inside ? ' is-inside' : ''}`} style={{ '--film-vh': FILM_VH } as CSSProperties} aria-labelledby="hx-hero-title">
      <div className="hx-film__stage">
        {painted ? null : <Poster />}
        <canvas
          ref={canvasRef}
          className="hx-film__canvas"
          role="img"
          aria-label="Một tòa nhà trọ ba tầng giữa hàng cây. Khi cuộn, ta bước tới cửa, cánh cửa mở ra cùng một vệt sáng chói, rồi đi qua từng góc trong nhà: góc học tập, bàn có ba món đồ kiểm tra, mảng tường cạnh cửa sổ, bàn trà giữa hai ghế, và căn phòng trên lầu vừa dọn vào."
        />
        <canvas ref={shiftRef} className="hx-film__canvas hx-film__shift" aria-hidden="true" />

        <div ref={heroRef} className="hx-film__hero">
          <SloganView />
        </div>

        {SCENES.map((scene, index) =>
          world ? (
            <article
              key={scene.id}
              className={`hx-world${index === active ? ' is-on' : ''}`}
              onFocus={() => reveal(scene)}
            >
              {SURFACES.filter(surface => surface.scene === scene.id).map(surface => (
                <div
                  key={surface.id}
                  ref={surfaceRefCallbacks.get(surface.id)}
                  className={`hx-surface hx-surface--${surface.id}`}
                  style={{ width: SURFACE_PX[surface.id], height: Math.round((SURFACE_PX[surface.id] * surface.h) / surface.w) }}
                >
                  <SurfaceView id={surface.id} checksOn={surface.id.startsWith('trust-') ? checksOn : 0} actions={actions} />
                </div>
              ))}
            </article>
          ) : (
            <article
              key={scene.id}
              className={`hx-film__panel hx-film__panel--${scene.side}${index === active ? ' is-on' : ''}`}
              onFocus={() => reveal(scene)}
            >
              <div className="hx-film__panel-inner">
                <SceneView id={scene.id} checksOn={scene.id === 'xac-minh' ? checksOn : 0} actions={actions} />
              </div>
            </article>
          ),
        )}

        <div ref={flareRef} className="hx-film__flare" aria-hidden="true" />
      </div>

      {/* In-page targets (nav, CTA): each lands mid-way through its scene. */}
      {SCENES.map(scene => (
        <span
          key={scene.id}
          id={scene.id}
          className="hx-film__anchor"
          style={{ '--at': rawForFilmProgress((scene.from + scene.to) / 2) } as CSSProperties}
          aria-hidden="true"
        />
      ))}
    </section>
  )
}
