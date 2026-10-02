import type { CSSProperties, ReactNode } from 'react'
import './AppContainer.css'

type Props = {
  children: ReactNode
  className?: string
  /** Full-bleed: no max-width / horizontal padding (hero, map edge). */
  bleed?: boolean
  as?: 'div' | 'section' | 'main'
  style?: CSSProperties
}

export function AppContainer({
  children,
  className = '',
  bleed = false,
  as: Tag = 'div',
  style,
}: Props) {
  return (
    <Tag
      className={[
        'app-container',
        bleed ? 'app-container--bleed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </Tag>
  )
}
