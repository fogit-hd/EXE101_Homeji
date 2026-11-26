import type { CSSProperties } from 'react'
import { PawPrint } from 'lucide-react'
import './day-dial.css'
import { clock, DAY_TO, DAYS, dialAngle, KINDS, SHARED, sweep } from './storyData'

/**
 * Chapter 04's picture, on every screen: one 24-hour clock face with two rings, An outside and
 * Bình inside, each ring coloured by what they do at that hour (12h at the top, midnight at the
 * bottom). A hand sweeps 6:00 → 23:30 and draws both days behind it; the stretches they share are
 * numbered on the rim and listed beside the dial, and the centre ends on the match.
 * The markup's resting state is the finished day. The desktop story scrubs it with GSAP (reading
 * data-at / data-len, fractions of the sweep); the phone story plays it with CSS (--d / --t).
 */
const C = 160
const RINGS = [134, 112] // An, Bình
const INNER = 100 // inside edge of the shared wedges
const OUTER = 146 // outside edge of the shared wedges
const BADGE = 160
const point = (hour: number, r: number) => {
  const a = (dialAngle(hour) * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)].map(n => n.toFixed(2))
}
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = point(from, r)
  const [x2, y2] = point(to, r)
  return `M${x1} ${y1}A${r} ${r} 0 ${to - from > 12 ? 1 : 0} 1 ${x2} ${y2}`
}
/** An's ring is free at 11:30–13:00, Bình's at 11:00–14:00: each initial sits in that gap. */
const AVATARS = [{ name: 'An', at: 12 }, { name: 'Bình', at: 12.65 }]
/** The phone plays the sweep in this many seconds, after a short beat. */
const PHONE_SWEEP = 3
const timing = (from: number, to: number) => {
  const at = sweep(from)
  const len = Math.max(sweep(to) - at, 0.02)
  return { at, len, style: { '--d': `${(0.3 + at * PHONE_SWEEP).toFixed(2)}s`, '--t': `${(len * PHONE_SWEEP).toFixed(2)}s` } as CSSProperties }
}
/** Hours trimmed off each end so the round caps of neighbouring blocks leave a small gap. */
const trim = (r: number) => (3 / ((2 * Math.PI * r) / 24))
/** A ring-shaped wedge between two radii, from one hour to another. */
const wedge = (from: number, to: number) => {
  const [a, b] = point(from, OUTER)
  const [c, d] = point(to, OUTER)
  const [e, f] = point(to, INNER)
  const [g, h] = point(from, INNER)
  return `M${a} ${b}A${OUTER} ${OUTER} 0 0 1 ${c} ${d}L${e} ${f}A${INNER} ${INNER} 0 0 0 ${g} ${h}Z`
}

export function DayDial() {
  return (
    <figure className="hx-dd" aria-label="Ví dụ: một ngày của bạn và bạn Duy trên đồng hồ 24 giờ, cùng giờ nấu ăn, giờ yên tĩnh và giờ ngủ">
      <div className="hx-dd__face">
        <svg viewBox="-12 -12 344 344" aria-hidden="true">
          {RINGS.map(r => <circle key={r} className="hx-dd__track" cx={C} cy={C} r={r} />)}
          {/* the hours: a fine dial of ticks inside the rings, four of them named */}
          {Array.from({ length: 24 }, (_, h) => {
            const [x1, y1] = point(h, h % 6 ? 92 : 87)
            const [x2, y2] = point(h, 96)
            return <line key={h} className={h % 6 ? 'hx-dd__tick' : 'hx-dd__tick hx-dd__tick--major'} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
          {[0, 6, 12, 18].map(h => {
            const [x, y] = point(h, 75)
            return <text key={h} className="hx-dd__hour" x={x} y={y}>{h}h</text>
          })}
          {/* what they share: a soft wedge across both rings, numbered outside the rim */}
          {SHARED.map((s, i) => {
            const [x, y] = point((s.from + s.to) / 2, BADGE)
            return (
              <g key={s.label} className="hx-dd__shared" style={{ '--d': `${(0.3 + sweep(s.to) * PHONE_SWEEP).toFixed(2)}s` } as CSSProperties}>
                <path d={wedge(s.from, s.to)} />
                <circle cx={x} cy={y} r={11} />
                <text x={x} y={y}>{i + 1}</text>
              </g>
            )
          })}
          {DAYS.map((day, ring) => day.slots.map((slot, i) => {
            const t = timing(slot.from, slot.to)
            const r = RINGS[ring]
            const cut = Math.min(trim(r), (slot.to - slot.from) / 3)
            return (
              <path key={`${day.name}${i}`} className={`hx-dd__arc hx-dd__arc--${slot.kind}`} d={arc(slot.from + cut, slot.to - cut, r)}
                pathLength={1} data-at={t.at.toFixed(4)} data-len={t.len.toFixed(4)} style={t.style} />
            )
          }))}
          {/* whose ring is whose: an initial on each ring, in its free gap around noon */}
          {AVATARS.map((a, ring) => {
            const [x, y] = point(a.at, RINGS[ring])
            return (
              <g key={a.name} className={`hx-dd__avatar hx-dd__avatar--${ring ? 'in' : 'out'}`}>
                <circle cx={x} cy={y} r={12} />
                <text x={x} y={y}>{a.name[0]}</text>
              </g>
            )
          })}
          {/* the hand: a short stroke across both rings, the centre stays clear */}
          <g className="hx-dd__hand" transform={`rotate(${dialAngle(DAY_TO)} ${C} ${C})`}>
            <line x1={C} y1={C - INNER + 2} x2={C} y2={C - OUTER - 4} />
          </g>
        </svg>
        <div className="hx-dd__center" aria-hidden="true">
          <span className="hx-dd__time">{clock(DAY_TO)}</span>
          <span className="hx-dd__match"><small>Hợp</small><b><span className="hx-dd__count">4</span>/4</b></span>
        </div>
      </div>

      <div className="hx-dd__side">
        <p className="hx-dd__title">Một ngày của <span className="hx-dd__chip hx-dd__chip--out" aria-hidden="true">A</span>An và <span className="hx-dd__chip hx-dd__chip--in" aria-hidden="true">B</span>Bình</p>
        <ol className="hx-dd__list">
          {SHARED.map((s, i) => (
            <li key={s.label} style={{ '--d': `${(0.3 + sweep(s.to) * PHONE_SWEEP).toFixed(2)}s` } as CSSProperties}>
              <span className="hx-dd__n">{i + 1}</span><time>{s.time}</time>{s.label}
            </li>
          ))}
          <li style={{ '--d': `${(0.3 + PHONE_SWEEP + 0.2).toFixed(2)}s` } as CSSProperties}>
            <span className="hx-dd__n"><PawPrint aria-hidden="true" /></span>Cả hai không nuôi thú cưng
          </li>
        </ol>
        <ul className="hx-dd__legend" aria-hidden="true">
          {KINDS.map(k => <li key={k.kind}><span className={`hx-sc__slot-${k.kind}`} />{k.label}</li>)}
        </ul>
        <figcaption>Minh họa</figcaption>
      </div>
    </figure>
  )
}
