import './MapEdgeToggle.css'

type MapEdgeToggleProps = {
  expanded: boolean
  onToggle: () => void
  collapseLabel: string
  expandLabel: string
  className?: string
  side?: 'left' | 'right'
}

function iconFor(side: 'left' | 'right', expanded: boolean): string {
  if (side === 'left') return expanded ? '‹' : '›'
  return expanded ? '›' : '‹'
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
