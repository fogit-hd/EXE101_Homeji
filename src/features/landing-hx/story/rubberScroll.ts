/**
 * Maps native scroll progress through the pinned film so camera glides fly past
 * quickly while each content scene acts like a rubber-band detent: scroll speed
 * compresses cleanly around the scene's sweet spot and springs slightly as it brakes.
 */

type Segment = {
  id: string
  kind: 'glide' | 'scene'
  rawFrom: number
  rawTo: number
  filmFrom: number
  filmTo: number
  snaps?: readonly number[]
}

const SEGMENTS: readonly Segment[] = [
  { id: 'outside', kind: 'glide', rawFrom: 0.0, rawTo: 0.14, filmFrom: 0.0, filmTo: 0.275 },
  { id: 'vi-sao', kind: 'scene', rawFrom: 0.14, rawTo: 0.30, filmFrom: 0.275, filmTo: 0.355, snaps: [0.315] },
  { id: 'glide-1', kind: 'glide', rawFrom: 0.30, rawTo: 0.335, filmFrom: 0.355, filmTo: 0.415 },
  { id: 'xac-minh', kind: 'scene', rawFrom: 0.335, rawTo: 0.535, filmFrom: 0.415, filmTo: 0.535, snaps: [0.438, 0.478, 0.518] },
  { id: 'glide-2', kind: 'glide', rawFrom: 0.535, rawTo: 0.57, filmFrom: 0.535, filmTo: 0.595 },
  { id: 'tim-phong', kind: 'scene', rawFrom: 0.57, rawTo: 0.71, filmFrom: 0.595, filmTo: 0.675, snaps: [0.635] },
  { id: 'glide-3', kind: 'glide', rawFrom: 0.71, rawTo: 0.745, filmFrom: 0.675, filmTo: 0.735 },
  { id: 'o-ghep', kind: 'scene', rawFrom: 0.745, rawTo: 0.885, filmFrom: 0.735, filmTo: 0.83, snaps: [0.782] },
  { id: 'glide-4', kind: 'glide', rawFrom: 0.885, rawTo: 0.915, filmFrom: 0.83, filmTo: 0.875 },
  { id: 've-nha', kind: 'scene', rawFrom: 0.915, rawTo: 1.0, filmFrom: 0.875, filmTo: 1.0, snaps: [0.94] },
]

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Monotonic cubic rubber resistance on [0, 1]:
 * steep at entry/exit (u=0, u=1 -> slope 2.56) and flat/sticky through the middle (u=0.5 -> slope 0.22).
 */
function rubberEase(u: number): number {
  const delta = u - 0.5
  return 0.5 + 0.22 * delta + 3.12 * delta * delta * delta
}

/** Maps raw scroll progress [0, 1] to film progress [0, 1] with fast glides and sticky scene detents. */
export function rubberProgress(rawP: number): number {
  const x = clamp01(rawP)
  if (x <= 0) return 0
  if (x >= 1) return 1
  for (const seg of SEGMENTS) {
    if (x <= seg.rawTo) {
      const u = (x - seg.rawFrom) / (seg.rawTo - seg.rawFrom)
      const eased = seg.kind === 'scene' ? rubberEase(u) : u
      return seg.filmFrom + eased * (seg.filmTo - seg.filmFrom)
    }
  }
  return 1
}

/** Finds the raw scroll position [0, 1] that corresponds to a target film progress [0, 1]. */
export function rawForFilmProgress(filmP: number): number {
  const target = clamp01(filmP)
  if (target <= 0) return 0
  if (target >= 1) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) * 0.5
    if (rubberProgress(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) * 0.5
}

/** True while `filmP` rests inside one of the content scenes (rather than gliding between them). */
export function isFilmInScene(filmP: number): boolean {
  const p = clamp01(filmP)
  return SEGMENTS.some(seg => seg.kind === 'scene' && p >= seg.filmFrom && p <= seg.filmTo)
}

/**
 * When scroll pauses inside a scene stop, returns the raw position of the nearest
 * magnetic detent inside that scene so the rubber spring settles crisply.
 */
export function magneticSnapTarget(rawP: number): number {
  const x = clamp01(rawP)
  const filmP = rubberProgress(x)
  for (const seg of SEGMENTS) {
    if (seg.kind !== 'scene') continue
    if (filmP >= seg.filmFrom && filmP <= seg.filmTo) {
      const snaps = seg.snaps ?? [(seg.filmFrom + seg.filmTo) * 0.5]
      let best = snaps[0]
      let bestDist = Math.abs(filmP - best)
      for (let i = 1; i < snaps.length; i += 1) {
        const dist = Math.abs(filmP - snaps[i])
        if (dist < bestDist) {
          best = snaps[i]
          bestDist = dist
        }
      }
      return rawForFilmProgress(best)
    }
  }
  return x
}
