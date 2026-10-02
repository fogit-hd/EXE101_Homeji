import { FOOD_ASSETS } from './foodAssets'

type Props = {
  value: number
  min?: number
  max: number
  disabled?: boolean
  label: string
  onChange: (next: number) => void
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled = false,
  label,
  onChange,
}: Props) {
  return (
    <div className="food-qty" role="group" aria-label={label}>
      <button
        type="button"
        className="food-qty__btn"
        aria-label={`Giảm ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <img src={FOOD_ASSETS.icons.minus} alt="" width={13} height={13} />
      </button>
      <output className="food-qty__value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="food-qty__btn"
        aria-label={`Tăng ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <img src={FOOD_ASSETS.icons.plus} alt="" width={13} height={13} />
      </button>
    </div>
  )
}
