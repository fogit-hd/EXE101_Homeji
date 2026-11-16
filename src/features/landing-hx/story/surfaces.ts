import camera from './camera.json'
import { camBetween } from './warp'
import places from './surfaces.json'

/*
 * Lays real HTML onto surfaces of the rendered scene. camera.json holds the
 * Blender camera for every rendered frame (tmp/blender/s75_story.py, mode
 * "camera"); surfaces.json names rectangles in the scene (a stretch of wall, a
 * table top). Each frame, the rectangle's corners are projected through the
 * camera and the element gets the CSS matrix3d that maps its box onto that
 * quad, so the text sits on the wall in perspective and moves with it.
 */

type Vec3 = [number, number, number]
export type Surface = {
  id: string
  scene: string
  origin: Vec3
  right: Vec3
  up: Vec3
  w: number
  h: number
  /** How far the content may slide down its plane to stay on screen (metres). */
  drop?: number
}

type Cam = { m: number[]; lens: number }
const FRAMES = camera.frames as unknown as Record<string, Cam>
const [RES_X, RES_Y] = camera.res
const SENSOR = camera.sensor

export const SURFACES = places.surfaces as Surface[]

/** A point of the scene in frame pixels (1920×1080 space), or null behind the camera. */
function project(cam: Cam, p: Vec3): [number, number] | null {
  const m = cam.m
  const dx = p[0] - m[3]
  const dy = p[1] - m[7]
  const dz = p[2] - m[11]
  // Camera space: the transpose of the rotation (its columns are the camera axes).
  const x = m[0] * dx + m[4] * dy + m[8] * dz
  const y = m[1] * dx + m[5] * dy + m[9] * dz
  const z = m[2] * dx + m[6] * dy + m[10] * dz
  if (z > -0.05) return null
  const k = cam.lens / SENSOR
  return [(0.5 + (x / -z) * k) * RES_X, (0.5 - (y / -z) * k * (RES_X / RES_Y)) * RES_Y]
}

function corners(s: Surface): Vec3[] {
  const at = (a: number, b: number): Vec3 => [
    s.origin[0] + s.right[0] * a - s.up[0] * b,
    s.origin[1] + s.right[1] * a - s.up[1] * b,
    s.origin[2] + s.right[2] * a - s.up[2] * b,
  ]
  return [at(0, 0), at(s.w, 0), at(s.w, s.h), at(0, s.h)]
}

/** Quad (TL, TR, BR, BL) in frame pixels, blended between two frames; null if not drawable. */
export function quadAt(s: Surface, a: number, b: number, t: number): [number, number][] | null {
  // Through the camera in between (as the film draws it, see warp.ts), so the text stays on its wall.
  const cam = camBetween(a, b, t)
  if (!cam) return null
  const pts: [number, number][] = []
  for (const c of corners(s)) {
    const p = project(cam, c)
    if (!p) return null
    pts.push(p)
  }
  return pts
}

type Box = { x0: number; y0: number; x1: number; y1: number }

/** Bounding box (frame pixels) of the surfaces over the given frames; null if any corner is behind the camera. */
function bounds(group: Surface[], frames: number[]): Box | null {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const f of frames) {
    const cam = FRAMES[f]
    if (!cam) continue
    for (const s of group) {
      for (const c of corners(s)) {
        const p = project(cam, c)
        if (!p) return null
        box.x0 = Math.min(box.x0, p[0])
        box.x1 = Math.max(box.x1, p[0])
        box.y0 = Math.min(box.y0, p[1])
        box.y1 = Math.max(box.y1, p[1])
      }
    }
  }
  return box.x0 === Infinity ? null : box
}

const add = (p: Vec3, q: Vec3, k = 1): Vec3 => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k]

/** The group scaled about `centre` and slid by `shift` (metres along right/up), all in its own plane. */
function moved(group: Surface[], centre: Vec3, scale: number, shift: [number, number]): Surface[] {
  const { right, up } = group[0]
  return group.map(s => {
    const rel: Vec3 = [s.origin[0] - centre[0], s.origin[1] - centre[1], s.origin[2] - centre[2]]
    const origin = add(add(add(centre, rel, scale), right, shift[0]), up, shift[1])
    return { ...s, origin, w: s.w * scale, h: s.h * scale }
  })
}

/**
 * The page shows the 16:9 frame with object-fit: cover, so a wide screen loses
 * the top and bottom of the frame and a narrow one its sides. A scene's
 * surfaces (one wall or table top) slide along their plane and, if they must,
 * shrink, until they stay inside the visible part of the frame (less `margin`)
 * over every frame the scene plays. They stay on the wall in true perspective.
 */
export function fitScene(
  group: Surface[],
  frames: number[],
  width: number,
  height: number,
  margin: { top: number; right: number; bottom: number; left: number },
): Surface[] {
  if (!group.length || !width || !height) return group
  const scaleView = Math.max(width / RES_X, height / RES_Y)
  const ox = (width - RES_X * scaleView) / 2
  const oy = (height - RES_Y * scaleView) / 2
  const win: Box = {
    x0: (margin.left - ox) / scaleView,
    x1: (width - margin.right - ox) / scaleView,
    y0: (margin.top - oy) / scaleView,
    y1: (height - margin.bottom - oy) / scaleView,
  }
  // Anchor: the middle of the group's bottom edge. What sits below the content (a desk, the
  // objects on it, a table edge) is part of the picture, so the content may rise or shrink
  // toward that edge but slide down only as far as its `drop` allows.
  const all = group.flatMap(corners)
  const up = group[0].up
  const along = (p: Vec3) => p[0] * up[0] + p[1] * up[1] + p[2] * up[2]
  const low = Math.min(...all.map(along))
  const mean = all.reduce<Vec3>((c, p) => add(c, p, 1 / all.length), [0, 0, 0])
  const centre = add(mean, up, low - along(mean))
  const mid = FRAMES[frames[frames.length >> 1]]
  if (!mid) return group
  let scale = 1
  let shift: [number, number] = [0, 0]
  for (let i = 0; i < 16; i += 1) {
    const box = bounds(moved(group, centre, scale, shift), frames)
    if (!box) return group
    const fit = Math.min(1, (win.x1 - win.x0) / (box.x1 - box.x0), (win.y1 - win.y0) / (box.y1 - box.y0))
    if (fit < 0.999) {
      scale *= fit * 0.99
      continue
    }
    const dx = box.x0 < win.x0 ? win.x0 - box.x0 : box.x1 > win.x1 ? win.x1 - box.x1 : 0
    const dy = box.y0 < win.y0 ? win.y0 - box.y0 : box.y1 > win.y1 ? win.y1 - box.y1 : 0
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) break
    // Screen pixels per metre along the plane's right and up, near the group's centre.
    const c = add(centre, group[0].right, shift[0])
    const here = project(mid, add(c, group[0].up, shift[1]))
    const r = project(mid, add(add(c, group[0].up, shift[1]), group[0].right, 0.1))
    const u = project(mid, add(add(c, group[0].up, shift[1]), group[0].up, 0.1))
    if (!here || !r || !u) break
    const a = (r[0] - here[0]) / 0.1
    const b = (u[0] - here[0]) / 0.1
    const cc = (r[1] - here[1]) / 0.1
    const d = (u[1] - here[1]) / 0.1
    const det = a * d - b * cc
    if (Math.abs(det) < 1e-6) break
    // Overshoot a little so the next pass settles inside rather than on the edge.
    const next: [number, number] = [shift[0] + ((d * dx - b * dy) / det) * 1.04, shift[1] + ((a * dy - cc * dx) / det) * 1.04]
    const floor = -Math.min(...group.map(surface => surface.drop ?? 0))
    if (next[1] < floor) {
      // It would have to move down: shrink toward the bottom edge instead.
      scale *= Math.max(0.8, Math.min(0.97, (win.y1 - win.y0) / (box.y1 - box.y0 + Math.abs(dy))))
      shift = [next[0], floor]
      continue
    }
    shift = next
  }
  return moved(group, centre, scale, shift)
}

/** Frame pixels → CSS pixels of a box that shows the frame with object-fit: cover. */
export function toView(quad: [number, number][], width: number, height: number): [number, number][] {
  const scale = Math.max(width / RES_X, height / RES_Y)
  const ox = (width - RES_X * scale) / 2
  const oy = (height - RES_Y * scale) / 2
  return quad.map(([x, y]) => [ox + x * scale, oy + y * scale])
}

/**
 * matrix3d mapping a w×h box (origin top-left, transform-origin 0 0) onto a quad.
 * The projective square-to-quad map, scaled from the unit square to the box.
 */
export function quadMatrix(w: number, h: number, q: [number, number][]): string | null {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  const det = dx1 * dy2 - dx2 * dy1
  if (Math.abs(det) < 1e-9) return null
  const g = (dx3 * dy2 - dx2 * dy3) / det
  const hh = (dx1 * dy3 - dx3 * dy1) / det
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + hh * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + hh * y3
  const values = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, x0, y0, 0, 1]
  return `matrix3d(${values.map(v => +v.toFixed(8)).join(',')})`
}
