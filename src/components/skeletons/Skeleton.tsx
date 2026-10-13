import type { CSSProperties, ReactNode } from 'react'
import './Skeleton.css'

type Size = number | string
const px = (v: Size | undefined) => (typeof v === 'number' ? `${v}px` : v)

/** Single shimmer block. Animation always runs (ignores reduced-motion by design). */
export function Sk({ w, h = 12, r, className = '', style }: {
  w?: Size
  h?: Size
  r?: Size
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={`sk ${className}`.trim()}
      style={{ width: px(w), height: px(h), borderRadius: px(r), ...style }}
      aria-hidden="true"
    />
  )
}

/** Light surface card that holds skeleton blocks. */
export function SkCard({ children, className = '', style }: { children?: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`sk-card ${className}`.trim()} style={style} aria-hidden="true">{children}</div>
}

/** Accessible wrapper for a whole page skeleton. */
export function SkScreen({ name, label, children, className = '' }: {
  name: string
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`sk-screen sk-screen--${name} ${className}`.trim()} role="status" aria-live="polite" aria-busy="true" data-skeleton={name}>
      <span className="sk-sr">{label}</span>
      {children}
    </div>
  )
}

/** Eyebrow + title + optional lead + optional right-side buttons. */
export function SkHeader({ eyebrow = false, lead = false, actions = 0, titleWidth = 280 }: {
  eyebrow?: boolean
  lead?: boolean
  actions?: number
  titleWidth?: Size
}) {
  return (
    <div className="sk-header">
      <div className="sk-stack">
        {eyebrow ? <Sk w={96} h={10} /> : null}
        <Sk w={titleWidth} h={28} r={10} className="sk-max" />
        {lead ? <Sk w={420} h={12} className="sk-max" /> : null}
      </div>
      {actions ? (
        <div className="sk-row">
          {Array.from({ length: actions }, (_, i) => <Sk key={i} w={i === actions - 1 ? 116 : 104} h={36} r={999} />)}
        </div>
      ) : null}
    </div>
  )
}

export function SkTabs({ count = 3, pill = true }: { count?: number; pill?: boolean }) {
  return (
    <div className="sk-row sk-tabs">
      {Array.from({ length: count }, (_, i) => <Sk key={i} w={i === 0 ? 92 : 78} h={pill ? 32 : 14} r={pill ? 999 : 6} />)}
    </div>
  )
}

export function SkLines({ widths = ['70%', '92%', '48%'], h = 12 }: { widths?: Size[]; h?: number }) {
  return <div className="sk-stack">{widths.map((w, i) => <Sk key={i} w={w} h={i === 0 ? h + 2 : h} />)}</div>
}

