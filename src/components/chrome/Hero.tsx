import type { ReactNode } from 'react'
import './Hero.css'

type Props = {
  /** First line of the title (neutral). */
  titleLine1: string
  /** Second line — rendered in accent color. */
  titleLine2: string
  description?: string
  /** Flat illustration / image slot (right side on desktop). */
  media?: ReactNode
  /** Optional content under description (CTAs). */
  children?: ReactNode
  className?: string
  /** Visual height band: default mid. */
  size?: 'sm' | 'md' | 'lg'
}

export function Hero({
  titleLine1,
  titleLine2,
  description,
  media,
  children,
  className = '',
  size = 'md',
}: Props) {
  return (
    <section
      className={`app-hero app-hero--${size} ${className}`.trim()}
      aria-label="Hero"
    >
      <div className="app-hero__inner">
        <div className="app-hero__copy">
          <h1 className="app-hero__title">
            <span className="app-hero__title-line">{titleLine1}</span>
            <span className="app-hero__title-accent">{titleLine2}</span>
          </h1>
          {description ? (
            <p className="app-hero__desc">{description}</p>
          ) : null}
          {children ? <div className="app-hero__extra">{children}</div> : null}
        </div>
        <div className="app-hero__media" aria-hidden={media ? undefined : true}>
          {media ?? (
            <div className="app-hero__flat">
              <img
                src="/mascot/review/homie_house_icon.svg"
                alt=""
                width={220}
                height={220}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
