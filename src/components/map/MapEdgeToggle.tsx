import { ChevronLeft, ChevronRight } from 'lucide-react'
import './MapEdgeToggle.css'

type MapEdgeToggleProps = {
  expanded: boolean
  onToggle: () => void
  collapseLabel: string
  expandLabel: string
  className?: string
  side?: 'left' | 'right'
}

function iconFor(side: 'left' | 'right', expanded: boolean) {
  if (side === 'left') return expanded ? <ChevronLeft aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />
  return expanded ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronLeft aria-hidden="true" size={16} />
}

export function MapEdgeToggle({
  expanded,
  onToggle,
  collapseLabel,
  expandLabel,
  className,
  side = 'left',
}: MapEdgeToggleProps) {
  const label = expanded ? collapseLabel : expandLabel
  return (
    <button
      type="button"
      className={`map-edge-toggle${expanded ? ' is-expanded' : ' is-collapsed'}${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <span className="map-edge-toggle__icon" aria-hidden>
        {iconFor(side, expanded)}
      </span>
    </button>
  )
}
