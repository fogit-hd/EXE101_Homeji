import { useId, type CSSProperties } from 'react'
import './liquid-progress.css'

type Props = {
  /** Number of steps rendered by the parent row. */
  total: number
  /** Steps before this zero-based index are complete. */
  current: number
  /** Every step, including the last, is complete. */
  complete?: boolean
}

/**
 * Decorative liquid behind a step row: completed steps fuse into one body and
 * the current step reaches toward the next. The parent keeps the readable
 * markup; this layer only mirrors its flex columns.
 */
export function LiquidProgressLayer({ total, current, complete = false }: Props) {
  const filterId = `hj-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <div className="liquid-progress" aria-hidden="true" style={{ filter: `url(#${filterId}) drop-shadow(0 6px 10px rgb(16 120 110 / 28%))` }}>
      <svg className="liquid-progress__defs" width="0" height="0" focusable="false">
        <filter id={filterId} x="-40" y="-40" width="4000" height="120" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
        </filter>
      </svg>
      {Array.from({ length: total }, (_, index) => {
        const state = complete || index < current ? 'done' : index === current ? 'current' : 'pending'
        // The bridge to the next step fills once that step has been reached.
        const bridge = index === total - 1 ? null : complete || index + 1 <= current ? 'filled' : index === current ? 'reaching' : null
        return (
          <div key={index} className="liquid-progress__cell" data-state={state} style={{ '--liquid-index': index } as CSSProperties}>
            {state !== 'pending' ? <i className="liquid-progress__blob" /> : null}
            {bridge ? <b className="liquid-progress__bridge" data-bridge={bridge} /> : null}
          </div>
        )
      })}
    </div>
  )
}
