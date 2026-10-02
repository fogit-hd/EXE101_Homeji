import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './SectionHeader.css'

type Props = {
  title: string
  description?: string
  seeAllTo?: string
  seeAllLabel?: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({
  title,
  description,
  seeAllTo,
  seeAllLabel = 'Xem tất cả →',
  action,
  className = '',
}: Props) {
  return (
    <div className={`section-header ${className}`.trim()}>
      <div className="section-header__copy">
        <h2 className="section-header__title">{title}</h2>
        {description ? (
          <p className="section-header__desc">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="section-header__action">{action}</div>
      ) : seeAllTo ? (
        <Link to={seeAllTo} className="section-header__link">
          {seeAllLabel}
        </Link>
      ) : null}
    </div>
  )
}
