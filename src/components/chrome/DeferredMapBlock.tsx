import type { CSSProperties, ReactNode } from 'react'
import './DeferredMapBlock.css'

type Props = {
  /** When false, children are not mounted (no Google Maps / heavy map tree). */
  visible: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Optional landmark for a11y when the map region is shown. */
  label?: string
}

/**
 * Reusable map host: only mounts `children` while `visible` is true.
 * Pass existing map UI (HomeMapStage, LocationPickerMap, mini place map) as children —
 * this wrapper does not fetch or own map data.
 */
export function DeferredMapBlock({
  visible,
  children,
  className = '',
  style,
  label = 'Bản đồ',
}: Props) {
  if (!visible) return null

  return (
    <div
      className={`deferred-map-block ${className}`.trim()}
      style={style}
      role="region"
      aria-label={label}
    >
      {children}
    </div>
  )
}
