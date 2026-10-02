import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './CategoryCard.css'

export type CategoryTone =
  | 'mint'
  | 'peach'
  | 'sky'
  | 'lilac'
  | 'sand'
  | 'rose'

type Props = {
  title: string
  subtitle?: string
  to: string
  icon?: ReactNode
  tone?: CategoryTone
  className?: string
  ariaLabel?: string
}

export function CategoryCard({
  title,
  subtitle,
  to,
  icon,
  tone = 'mint',
  className = '',
  ariaLabel,
}: Props) {
  return (
    <Link
      to={to}
      className={`category-card category-card--${tone} ${className}`.trim()}
      aria-label={ariaLabel ?? title}
    >
      <span className="category-card__icon" aria-hidden>
        {icon ?? (
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path
              fill="currentColor"
              d="M12 3 4 9v12h6v-6h4v6h6V9l-8-6zm0 2.2 6 4.5V19h-2v-6H8v6H6v-9.3l6-4.5z"
            />
          </svg>
        )}
      </span>
      <span className="category-card__copy">
        <span className="category-card__title">{title}</span>
        {subtitle ? (
          <span className="category-card__subtitle">{subtitle}</span>
        ) : null}
      </span>
      <span className="category-card__arrow" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="currentColor"
            d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
          />
        </svg>
      </span>
    </Link>
  )
}
