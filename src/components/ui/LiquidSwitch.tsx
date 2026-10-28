import type { MouseEvent, ReactNode } from 'react'
import './LiquidSwitch.css'

export type LiquidSwitchProps = {
  checked: boolean
  onChange?: (checked: boolean, event: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  'aria-label'?: string
  title?: string
  className?: string
  id?: string
  offContent?: ReactNode
  onContent?: ReactNode
  children?: ReactNode
}

/**
 * LiquidSwitch: A universal toggle switch featuring a 3D translucent
 * convex droplet thumb with specular highlights, ambient occlusion shadow,
 * and backdrop-filter refraction bending the track underneath.
 */
export function LiquidSwitch({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  title,
  className = '',
  id,
  offContent,
  onContent,
  children,
}: LiquidSwitchProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    onChange?.(!checked, e)
  }

  const handleKeyDown = (e: import('react').KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'ArrowLeft' && checked) {
      e.preventDefault()
      onChange?.(false, e as unknown as MouseEvent<HTMLButtonElement>)
    } else if (e.key === 'ArrowRight' && !checked) {
      e.preventDefault()
      onChange?.(true, e as unknown as MouseEvent<HTMLButtonElement>)
    }
  }

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`liquid-switch${checked ? ' liquid-switch--checked' : ''}${
        disabled ? ' liquid-switch--disabled' : ''
      }${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {offContent && (
        <span
          className={`liquid-switch__content liquid-switch__content--off${
            checked ? ' is-dimmed' : ''
          }`}
          aria-hidden="true"
        >
          {offContent}
        </span>
      )}
      {onContent && (
        <span
          className={`liquid-switch__content liquid-switch__content--on${
            !checked ? ' is-dimmed' : ''
          }`}
          aria-hidden="true"
        >
          {onContent}
        </span>
      )}
      {children}
      <span
        className="liquid-switch__thumb"
        data-glass-lens=""
        data-glass-profile="bead"
        aria-hidden="true"
      />
    </button>
  )
}
