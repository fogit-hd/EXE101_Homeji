import './ListMapSwitch.css'
import type { ExploreView } from './exploreMode'

type Props = {
  value: ExploreView
  onChange: (view: ExploreView) => void
  className?: string
  listLabel?: string
  mapLabel?: string
  id?: string
}

/**
 * Segmented control: Danh sách | Bản đồ for Khám phá.
 * Controlled — parent owns URL/state (see exploreMode helpers).
 */
export function ListMapSwitch({
  value,
  onChange,
  className = '',
  listLabel = 'Danh sách',
  mapLabel = 'Bản đồ',
  id = 'explore-view-switch',
}: Props) {
  return (
    <div
      className={`list-map-switch ${className}`.trim()}
      role="group"
      aria-label="Chế độ Khám phá"
      id={id}
    >
      <button
        type="button"
        className={`list-map-switch__btn${value === 'list' ? ' is-active' : ''}`}
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
      >
        {listLabel}
      </button>
      <button
        type="button"
        className={`list-map-switch__btn${value === 'map' ? ' is-active' : ''}`}
        aria-pressed={value === 'map'}
        onClick={() => onChange('map')}
      >
        {mapLabel}
      </button>
    </div>
  )
}
