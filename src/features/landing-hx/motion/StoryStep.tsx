import { useEffect, useRef, type ReactNode } from 'react'
import { useInView } from 'motion/react'

type StoryStepProps = {
  index: number
  /** Called when this step crosses the middle band of the viewport. */
  onActive: (index: number) => void
  active: boolean
  className?: string
  children: ReactNode
}

/**
 * One chapter of a scroll story. It reports itself active while it sits in the
 * middle band of the viewport (an IntersectionObserver line, no scroll handler).
 * The chapter's own text is always in the DOM and readable; only the shared
 * visual reacts to which chapter is active.
 */
export function StoryStep({ index, onActive, active, className, children }: StoryStepProps) {
  const ref = useRef<HTMLElement>(null)
  const inBand = useInView(ref, { margin: '-45% 0px -45% 0px' })

  useEffect(() => {
    if (inBand) onActive(index)
  }, [inBand, index, onActive])

  return (
    <article
      ref={ref}
      className={[className ?? '', active ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'step' : undefined}
    >
      {children}
    </article>
  )
}
