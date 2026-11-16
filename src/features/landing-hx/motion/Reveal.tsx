import type { ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'

/**
 * Play-once entrances for the landing. Everything here animates opacity and
 * transform only, runs a single time on the way down, and renders plain static
 * markup when the visitor prefers reduced motion.
 */

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const VIEWPORT = { once: true, amount: 0.2 } as const
/*
 * Groups trigger on their top edge, not a share of their height. A stacked list on a
 * phone can be several screens tall (8 listing cards ≈ 3,600px), so "20% visible" meant
 * ~720px had to be on screen before anything appeared: a jump to #tin-noi-bat landed on
 * a blank grid. 'some' fires as soon as any part is in view; the bottom margin waits
 * until the top edge is ~12% up from the bottom so the stagger is still seen.
 */
const GROUP_VIEWPORT = { once: true, amount: 'some', margin: '0px 0px -12% 0px' } as const

type Tag = 'div' | 'section' | 'li' | 'ul' | 'ol' | 'article' | 'header' | 'p'

const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  li: motion.li,
  ul: motion.ul,
  ol: motion.ol,
  article: motion.article,
  header: motion.header,
  p: motion.p,
} as const

type RevealProps = {
  as?: Tag
  /** Seconds. */
  delay?: number
  /** Start offset in px. */
  y?: number
  className?: string
  id?: string
  children: ReactNode
}

/** A single block that fades and rises into place the first time it scrolls into view. */
export function Reveal({ as = 'div', delay = 0, y = 18, className, id, children }: RevealProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as
    return <Static className={className} id={id}>{children}</Static>
  }
  const MotionTag = MOTION_TAGS[as]
  return (
    <MotionTag
      className={className}
      id={id}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </MotionTag>
  )
}

const groupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
}

/** Parent of RevealItem children; staggers them 70ms apart, once. */
export function RevealGroup({ as = 'div', className, id, children }: Omit<RevealProps, 'delay' | 'y'>) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as
    return <Static className={className} id={id}>{children}</Static>
  }
  const MotionTag = MOTION_TAGS[as]
  return (
    <MotionTag className={className} id={id} variants={groupVariants} initial="hidden" whileInView="shown" viewport={GROUP_VIEWPORT}>
      {children}
    </MotionTag>
  )
}

export function RevealItem({ as = 'div', className, children }: Omit<RevealProps, 'delay' | 'y' | 'id'>) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as
    return <Static className={className}>{children}</Static>
  }
  const MotionTag = MOTION_TAGS[as]
  return <MotionTag className={className} variants={itemVariants}>{children}</MotionTag>
}
