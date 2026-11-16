import { useRef, type ReactNode } from 'react'
import { useSceneReveal, type RevealTimelineBuilder } from '../scroll/useSceneReveal'
import { useBrandIntroComplete } from '../../../hooks/useBrandIntroComplete'

type LandingSceneShellProps = {
  id: string
  eyebrow?: string
  title: string
  lead?: string
  children?: ReactNode
  buildTimeline: RevealTimelineBuilder
  stageClassName?: string
}

/** Shared layout + play-once entrance for guest landing scenes. */
export function LandingSceneShell({
  id,
  eyebrow,
  title,
  lead,
  children,
  buildTimeline,
  stageClassName,
}: LandingSceneShellProps) {
  const rootRef = useRef<HTMLElement>(null)
  const introComplete = useBrandIntroComplete()

  useSceneReveal({ rootRef, enabled: introComplete, buildTimeline })

  return (
    <section
      id={id}
      ref={rootRef}
      className="hl-scene"
      data-landing-scene={id}
    >
      <div className={`hl-scene__stage${stageClassName ? ` ${stageClassName}` : ''}`}>
        <header className="hl-scene__copy">
          {eyebrow ? <p className="hl-scene__eyebrow" data-scrub="eyebrow">{eyebrow}</p> : null}
          <h2 className="hl-scene__title" data-scrub="title">{title}</h2>
          {lead ? <p className="hl-scene__lead" data-scrub="lead">{lead}</p> : null}
        </header>
        <div className="hl-scene__visual" data-scrub="visual">
          {children}
        </div>
      </div>
    </section>
  )
}
