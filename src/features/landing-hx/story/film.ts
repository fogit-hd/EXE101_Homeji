/*
 * The landing film (every frame inside, every 2nd on the street outside), drawn on one
 * canvas and scrubbed by native scroll. Scroll progress (0..1 over the pinned
 * stretch) maps to frame ranges; between two frames the canvas blends both,
 * and across a cut (door → first corner, ground floor → upstairs) the last and
 * first frames cross-dissolve.
 */

import { FilmVideo } from './video'
import { DEPTH_URL, WarpRenderer, type Picture } from './warp'

const range = (from: number, to: number, step = 1) => {
  const frames: number[] = []
  for (let f = from; f <= to; f += step) frames.push(f)
  return frames
}

/** [from, to, frames]: scroll progress `from..to` plays `frames`. Gaps between segments dissolve. */
type Segment = readonly [number, number, number[]]

export const SEGMENTS: Segment[] = [
  [0.0, 0.225, range(1, 129, 2)], // outside: walk up, the door opens, light floods out
  [0.235, 0.355, range(201, 220)], // A: study corner (why Homeji, chapter 1)
  [0.355, 0.415, range(221, 240)], //    glide
  [0.415, 0.535, range(241, 260)], // B: papers on the table (verification)
  [0.535, 0.595, range(261, 280)], //    glide
  [0.595, 0.675, range(281, 300)], // D: chair by the window (find, chapter 2)
  [0.675, 0.735, range(301, 320)], //    glide
  [0.735, 0.83, range(321, 339)], // C: tea for two (roommate, chapter 3)
  [0.855, 1.0, range(401, 419)], //  E: the room upstairs, just moved in (chapter 4)
]

export const ALL_FRAMES = SEGMENTS.flatMap(segment => segment[2])

/** Day plays in the light theme, the same film at night in the dark theme. */
export type FilmTime = 'day' | 'night'

/** The whole film for one time of day, as one video (see video.ts). */
export function filmUrl(time: FilmTime) {
  return `/landing/story/film-${time}.bin`
}

/** A still of the film (the poster, and the scenes when motion is reduced); only these are kept as pictures. */
export function frameUrl(frame: number, time: FilmTime = 'day') {
  return `/landing/story/${time === 'night' ? 'night/' : ''}1280/f_${String(frame).padStart(4, '0')}.webp`
}

/**
 * The time-lapse played on the opening shot when the theme changes: the sun sets in the west
 * (left of the frame) on the way to the dark theme, and rises in the east (right) on the way back.
 */
export type Lapse = 'sunset' | 'sunrise'

const lapses = new Map<Lapse, Promise<FilmVideo>>()

/** Fetches a time-lapse (one ~0.5 MB video) once. */
export function prefetchLapse(kind: Lapse): Promise<FilmVideo> {
  let video = lapses.get(kind)
  if (!video) {
    video = FilmVideo.load(`/landing/story/lapse-${kind}.bin`)
    video.catch(() => lapses.delete(kind))
    lapses.set(kind, video)
  }
  return video
}

/**
 * Plays a time-lapse on a canvas over `duration` ms (eased), decoding a few frames ahead and
 * letting go of the ones already shown. Resolves when the last frame is up.
 */
export function playLapse(canvas: HTMLCanvasElement, video: FilmVideo, duration: number, cancelled: () => boolean) {
  const ctx = canvas.getContext('2d', { alpha: false })
  const count = video.frames.length
  // The decoder's own frames, drawn as they are: copying each into an ImageBitmap first cost the
  // main thread a few ms a frame, felt as a stutter right as the theme changes.
  const bitmaps: (VideoFrame | undefined)[] = []
  video.onVideoFrame = (frame, picture) => {
    const i = video.frames.indexOf(frame)
    if (bitmaps[i] || i < 0) picture.close()
    else bitmaps[i] = picture
  }
  const release = () => {
    video.onVideoFrame = undefined
    bitmaps.forEach(bitmap => bitmap?.close())
  }
  return new Promise<void>(resolve => {
    if (!ctx) return resolve()
    video.want([0, 1, 2, 3])
    let start = 0
    let shown = -1
    const step = (now: number) => {
      if (cancelled()) {
        release()
        return resolve()
      }
      if (!start) {
        // Start the clock on the first decoded frame, so a slow decode never skips the start.
        if (!bitmaps[0]) return requestAnimationFrame(step)
        start = now
      }
      const t = Math.min(1, (now - start) / duration)
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const index = Math.round(eased * (count - 1))
      video.want([index, index + 4, index + 8])
      let ready = index
      while (ready > shown && !bitmaps[ready]) ready -= 1
      if (ready > shown) {
        const bitmap = bitmaps[ready]!
        if (canvas.width !== bitmap.displayWidth) canvas.width = bitmap.displayWidth
        if (canvas.height !== bitmap.displayHeight) canvas.height = bitmap.displayHeight
        ctx.drawImage(bitmap, 0, 0)
        for (let i = shown + 1; i < ready; i += 1) {
          bitmaps[i]?.close()
          bitmaps[i] = undefined
        }
        shown = ready
      }
      // Done on the last frame, or give up waiting for it a second after the clock ran out.
      if (shown === count - 1 || now - start > duration + 1000) {
        release()
        return resolve()
      }
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

/**
 * The two frames around a scroll position, how much of the second shows, and whether the two
 * sit either side of a cut (the gap between two segments) rather than next to each other.
 */
export function framesAt(progress: number): [number, number, number, boolean] {
  for (let i = 0; i < SEGMENTS.length; i += 1) {
    const [from, to, frames] = SEGMENTS[i]
    if (progress < from) {
      if (i === 0) return [frames[0], frames[0], 0, false]
      const previous = SEGMENTS[i - 1]
      const t = (progress - previous[1]) / (from - previous[1])
      return [previous[2][previous[2].length - 1], frames[0], Math.min(1, Math.max(0, t)), true]
    }
    if (progress <= to) {
      const x = ((progress - from) / (to - from)) * (frames.length - 1)
      const k = Math.floor(x)
      return [frames[k], frames[Math.min(k + 1, frames.length - 1)], x - k, false]
    }
  }
  const last = ALL_FRAMES[ALL_FRAMES.length - 1]
  return [last, last, 0, false]
}

/** The door flare: builds while the door swings open, peaks over the cut, fades into the study. */
export function flareAt(progress: number) {
  const up = (progress - 0.17) / 0.06
  const down = 1 - (progress - 0.235) / 0.04
  return Math.max(0, Math.min(1, up, down))
}

/**
 * Frames decoded and kept ready around the one on screen, each side. A decoded
 * 1280×720 frame is 3.7 MB, so the whole film decoded would be ~800 MB; the
 * browser then throws decoded pictures away and decodes them again inside the
 * draw, which is what made scrolling back stutter. ±12 frames is ~92 MB.
 */
const KEEP = 12

/*
 * The picture never rests on a half-and-half mix of two frames: between neighbours it holds each
 * frame for a moment and mixes over the middle 80% of the step (soften), eases after the scroll (FOLLOW),
 * and settles onto the nearer frame once the scroll stops (SETTLE). Across a cut the mix is not
 * tied to the scroll at all: past the middle of the gap the next shot dissolves in over ~0.4 s.
 * Time constants in ms.
 */
const FOLLOW = 45
const SETTLE = 80
const CUT = 130
const IDLE_MS = 160
const soften = (t: number) => Math.min(1, Math.max(0, (t - 0.1) / 0.8))

export class FilmPlayer {
  /** The film playing, compressed (see video.ts). */
  private video: FilmVideo | null = null
  /** Both films, each fetched once: a theme change swaps the film in place, keeping the renderer. */
  private films = new Map<FilmTime, Promise<FilmVideo>>()
  /** Decoded pictures, only around the current frame. */
  private bitmaps = new Map<number, Picture>()
  /** Pictures still from the previous film after a theme change, replaced as the new film decodes. */
  private stale = new Set<number>()
  private swapped?: () => void
  private cancelled = false
  private drawn = ''
  private index = 0
  private ctx: CanvasRenderingContext2D | null = null
  /** WebGL: moves the camera between frames that have depth (see warp.ts); null falls back to 2D. */
  private warp: WarpRenderer | null
  private canvas: HTMLCanvasElement
  private onFirstPaint?: () => void
  private time: FilmTime

  constructor(canvas: HTMLCanvasElement, onFirstPaint?: () => void, time: FilmTime = 'day') {
    this.canvas = canvas
    this.time = time
    this.warp = WarpRenderer.create(canvas)
    if (!this.warp) this.ctx = canvas.getContext('2d', { alpha: false })
    this.onFirstPaint = onFirstPaint
  }

  start() {
    void this.use(this.time)
    if (this.warp) this.loadDepth()
  }

  /** Fetches a film without playing it, so a later theme change has nothing to wait for. */
  prefetch(time: FilmTime) {
    this.film(time).catch(() => {})
  }

  private film(time: FilmTime) {
    let film = this.films.get(time)
    if (!film) {
      // A night film that is missing falls back to the day film.
      film = FilmVideo.load(filmUrl(time)).catch(error => {
        if (time === 'day') throw error
        return FilmVideo.load(filmUrl('day'))
      })
      film.catch(() => this.films.delete(time))
      this.films.set(time, film)
    }
    return film
  }

  /**
   * Plays the other time of day from the same place: the pictures on screen stay until the new
   * film's are decoded. Resolves once the frame on screen is from the new film.
   */
  setTime(time: FilmTime): Promise<void> {
    if (time === this.time) return Promise.resolve()
    this.time = time
    return this.use(time)
  }

  private use(time: FilmTime) {
    return new Promise<void>(resolve => {
      this.film(time)
        .then(video => {
          if (this.cancelled || this.time !== time) return resolve()
          if (this.video && this.video !== video) {
            // The old film stops decoding but stays fetched, for the way back.
            this.video.pause()
            for (const frame of this.bitmaps.keys()) this.stale.add(frame)
          }
          this.video = video
          if (this.warp) video.onVideoFrame = (frame, picture) => this.receive(frame, this.warp ? this.warp.adopt(picture) : (picture.close(), null))
          else video.onFrame = (frame, bitmap) => this.receive(frame, bitmap)
          this.swapped = this.stale.size ? resolve : undefined
          this.keepAround()
          if (!this.swapped) resolve()
        })
        .catch(() => resolve())
    })
  }

  /** Whether the door flare is drawn with the picture (WebGL); otherwise the page draws it (story.css). */
  get drawsFlare() {
    return !!this.warp
  }

  private flare = 0
  private stage: readonly [number, number] = [1, 1]

  /** The door flare (0..1) and the size of the stage the canvas covers, in CSS px. */
  setFlare(flare: number, width: number, height: number) {
    if (flare === this.flare && width === this.stage[0] && height === this.stage[1]) return
    this.flare = flare
    this.stage = [width, height]
    // No draw here: the scroll calls setProgress right after, which draws once with both.
  }

  /** Dev only: how often the picture had to hold an older frame, and decode timings. */
  stats = { holds: 0, draws: 0, received: 0, wasted: 0 }

  private receive(frame: number, bitmap: Picture | null) {
    if (!bitmap) return
    this.stats.received += 1
    const fresh = this.bitmaps.has(frame) && !this.stale.has(frame)
    if (this.cancelled || fresh || Math.abs(ALL_FRAMES.indexOf(frame) - this.index) > KEEP + 2) {
      this.stats.wasted += 1
      bitmap.close()
      return
    }
    const old = this.bitmaps.get(frame)
    if (old) {
      this.warp?.forget(old)
      old.close()
      this.stale.delete(frame)
    }
    this.bitmaps.set(frame, bitmap)
    if (this.swapped && !this.stale.has(this.shownA) && !this.stale.has(this.shownB)) {
      // Resolve after this draw, so the new picture is on the canvas.
      const done = this.swapped
      this.swapped = undefined
      queueMicrotask(done)
    }
    this.warp?.prepare(bitmap)
    if (this.bitmaps.size === 1) this.resize(bitmap)
    // Repaint only when the new picture can show: it is one of the two on screen, or the screen is
    // holding a stand-in. A neighbour decoded ahead of the scroll waits for its turn.
    const a = this.shownA
    const b = this.shownB
    if (frame === a || frame === b || !this.bitmaps.has(a) || !this.bitmaps.has(b) || this.stale.has(a) || this.stale.has(b)) {
      this.drawn = ''
      this.draw()
    }
  }

  /** The depth maps, one small atlas for the whole film (the same by day and night). */
  private loadDepth() {
    fetch(DEPTH_URL)
      .then(response => (response.ok ? response.blob() : Promise.reject(new Error('depth missing'))))
      .then(blob => createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then(bitmap => {
        if (!this.cancelled && this.warp) this.warp.setDepth(bitmap)
        bitmap.close()
        this.drawn = ''
        this.retarget()
      })
      .catch(() => {})
  }

  /** Whether the picture between `a` and `b` is a camera move (continuous) rather than a cross-fade. */
  private moving(a: number, b: number) {
    return !!this.warp && this.warp.canWarp(a, b)
  }

  stop() {
    this.cancelled = true
    cancelAnimationFrame(this.raf)
    cancelAnimationFrame(this.later)
    window.clearTimeout(this.idleTimer)
    this.video?.close()
    for (const film of this.films.values()) film.then(video => video.close()).catch(() => {})
    for (const bitmap of this.bitmaps.values()) bitmap.close()
    this.bitmaps.clear()
    this.warp?.dispose()
  }

  /** Called on every eased step, so content laid on the picture can follow it. */
  onAnimate?: () => void

  /** The frames on screen and the mix between them, or null before the first scroll position. */
  visual(): [number, number, number] | null {
    return this.shownA ? [this.shownA, this.shownB, this.shownT] : null
  }

  setProgress(progress: number) {
    const [a, b, t, cut] = framesAt(progress)
    const index = ALL_FRAMES.indexOf(a)
    if (index !== this.index) {
      this.index = index
      this.keepAround()
    }
    if (a !== this.shownA || b !== this.shownB) {
      // Carry on from the frame that was showing, whichever way the scroll went.
      const showing = this.shownT < 0.5 ? this.shownA : this.shownB
      this.shownT = showing === a ? 0 : showing === b ? 1 : cut ? Math.round(t) : this.moving(a, b) ? t : soften(t)
      this.shownA = a
      this.shownB = b
    }
    this.rawT = t
    this.cut = cut
    this.idle = false
    window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      this.idle = true
      this.retarget()
    }, IDLE_MS)
    this.retarget()
  }

  private shownA = 0
  private shownB = 0
  private shownT = 0
  private rawT = 0
  private cut = false
  private idle = false
  private target = 0
  private tau = FOLLOW
  private raf = 0
  private lastTick = 0
  private idleTimer = 0

  private retarget() {
    if (this.cancelled) return
    if (this.cut) {
      this.target = this.rawT < 0.5 ? 0 : 1
      this.tau = CUT
    } else if (this.moving(this.shownA, this.shownB)) {
      // A camera move: follow the scroll exactly while it moves. At rest, glide to the nearer rendered
      // frame: an in-between is rebuilt from a coarse depth map and, held still, its edges can show.
      this.target = this.idle ? Math.round(this.rawT) : this.rawT
      this.tau = this.idle ? SETTLE : FOLLOW
    } else {
      const t = soften(this.rawT)
      this.target = this.idle ? Math.round(t) : t
      this.tau = this.idle ? SETTLE : FOLLOW
    }
    if (Math.abs(this.target - this.shownT) < 0.004) this.shownT = this.target
    else if (!this.raf) {
      this.lastTick = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    }
    this.draw()
  }

  private tick = (now: number) => {
    this.raf = 0
    if (this.cancelled) return
    const dt = Math.max(0, now - this.lastTick)
    this.lastTick = now
    this.shownT += (this.target - this.shownT) * (1 - Math.exp(-dt / this.tau))
    if (Math.abs(this.target - this.shownT) < 0.004) this.shownT = this.target
    else this.raf = requestAnimationFrame(this.tick)
    this.draw()
    this.onAnimate?.()
  }

  /**
   * Decode the frames near the current one (nearest first, in the video decoder)
   * and let go of the ones that have drifted out of range.
   */
  private keepAround() {
    if (this.cancelled) return
    for (const [frame, bitmap] of this.bitmaps) {
      if (Math.abs(ALL_FRAMES.indexOf(frame) - this.index) > KEEP + 2) {
        this.warp?.forget(bitmap)
        bitmap.close()
        this.bitmaps.delete(frame)
        this.stale.delete(frame)
      }
    }
    if (!this.video) return
    const wanted: number[] = []
    for (let d = 0; d <= KEEP; d += 1) {
      for (const i of d === 0 ? [this.index] : [this.index + d, this.index - d]) {
        const frame = ALL_FRAMES[i]
        if (frame !== undefined && (!this.bitmaps.has(frame) || this.stale.has(frame))) wanted.push(i)
      }
    }
    // The film's frames are ALL_FRAMES in order, so an index here is a frame's place in the video.
    if (wanted.length) this.video.want(wanted)
  }

  /**
   * The canvas keeps the frames' own size (1280×720) and CSS scales it with
   * object-fit: cover, so each draw is a plain copy, not a resample.
   */
  private resize(bitmap: Picture) {
    if (bitmap.width === this.canvas.width && bitmap.height === this.canvas.height) return
    this.canvas.width = bitmap.width
    this.canvas.height = bitmap.height
    this.drawn = ''
  }

  private nearestLoaded(frame: number) {
    const index = ALL_FRAMES.indexOf(frame)
    for (let d = 0; d < ALL_FRAMES.length; d += 1) {
      const before = ALL_FRAMES[index - d]
      const after = ALL_FRAMES[index + d]
      if (before !== undefined && this.bitmaps.has(before)) return before
      if (after !== undefined && this.bitmaps.has(after)) return after
    }
    return null
  }

  private paint(img: Picture, alpha: number) {
    const ctx = this.ctx!
    ctx.globalAlpha = alpha
    ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
  }

  /** document.timeline time of the frame last rendered in WebGL, and a repaint put off to the next frame. */
  private renderedAt: number | null = null
  private later = 0

  private draw() {
    if (this.canvas.width === 0) return
    if (this.warp) return this.drawWarp()
    if (!this.ctx) return
    // The eased picture (see FOLLOW above); a full mix is simply the second frame.
    const b = this.shownB
    const full = this.shownT >= 0.995
    const a = full ? b : this.shownA
    const t = full ? 0 : this.shownT
    if (!a) return
    const base = this.bitmaps.has(a) ? a : this.nearestLoaded(a)
    if (base === null) return
    const blend = base === a && t > 0.01 && b !== a && this.bitmaps.has(b)
    // Quantise the blend so tiny scroll steps don't repaint the same picture.
    const key = `${base}|${blend ? `${b}|${t.toFixed(2)}` : ''}`
    if (key === this.drawn) return
    const first = this.drawn === '' && !this.painted
    this.paint(this.bitmaps.get(base)!, 1)
    if (blend) this.paint(this.bitmaps.get(b)!, t)
    this.ctx.globalAlpha = 1
    this.drawn = key
    if (first) {
      this.painted = true
      this.onFirstPaint?.()
    }
  }

  private drawWarp() {
    const warp = this.warp!
    const a0 = this.shownA
    if (!a0) return
    let a = a0
    let b = this.shownB
    let t = this.shownT
    this.stats.draws += 1
    if (!this.bitmaps.has(a)) {
      this.stats.holds += 1
      // Not decoded yet: hold the nearest picture there is.
      const near = this.nearestLoaded(a)
      if (near === null) return
      a = b = near
      t = 0
    } else if (!this.bitmaps.has(b)) {
      b = a
      t = 0
    }
    const moving = this.moving(a, b)
    if (!moving && t >= 0.995) {
      a = b
      t = 0
    }
    const key = `${a}|${b}|${t.toFixed(moving ? 3 : 2)}|${moving}|${this.flare}|${this.stage.join('x')}`
    if (key === this.drawn) return
    // One WebGL render per screen frame: the scroll, the easing and a newly decoded frame can each ask
    // in the same frame, and every render rebuilds both frames in 3D. A second ask in the same frame
    // is drawn at the start of the next one (the two pictures differ by one easing step at most).
    const now = document.timeline.currentTime
    if (this.painted && now !== null && now === this.renderedAt) {
      if (!this.later) {
        this.later = requestAnimationFrame(() => {
          this.later = 0
          this.draw()
        })
      }
      return
    }
    this.renderedAt = now as number | null
    const first = !this.painted
    warp.draw(a, this.bitmaps.get(a)!, b, this.bitmaps.get(b)!, t, this.flare, this.stage)
    this.drawn = key
    if (first) {
      this.painted = true
      this.onFirstPaint?.()
    }
  }

  private painted = false
}
