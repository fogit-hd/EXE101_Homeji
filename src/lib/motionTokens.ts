import type { Transition, Variants } from 'motion/react'

/**
 * Single source of truth for UI motion (Motion / `motion/react`).
 * GSAP is reserved for the brand intro only. CSS mirrors live in index.css
 * (`--ease-out`, `--dur-*`) for hover/colour transitions that stay in CSS.
 */
export const DURATION = {
  press: 0.12,
  fast: 0.16,
  base: 0.24,
  panel: 0.32,
  reveal: 0.38,
  exit: 0.18,
} as const

export const EASE = {
  /** Matches --ease-out / cubic-bezier(.16,1,.3,1) used across the app. */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
} as const

export const SPRING = {
  soft: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } satisfies Transition,
  snappy: { type: 'spring', stiffness: 520, damping: 34 } satisfies Transition,
} as const

export const STAGGER = { list: 0.035, maxItems: 8 } as const

export const transitions = {
  base: { duration: DURATION.base, ease: EASE.out } satisfies Transition,
  reveal: { duration: DURATION.reveal, ease: EASE.out } satisfies Transition,
  exit: { duration: DURATION.exit, ease: EASE.in } satisfies Transition,
}

/** Opacity-only route/section fade (transforming ancestors breaks sticky/fixed children). */
export const routeFade: Variants = {
  initial: { opacity: 0.3 },
  enter: { opacity: 1, transition: transitions.base },
}

export const fadeSwap: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: transitions.base },
  exit: { opacity: 0, transition: transitions.exit },
}

/** Card/list entrance; index is capped so long lists never feel slow. */
export const listItem: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...transitions.reveal, delay: Math.min(index, STAGGER.maxItems) * STAGGER.list },
  }),
}

export const popup = {
  open: { opacity: 1, y: 0, scale: 1 },
  closed: { opacity: 0, y: 16, scale: 0.94 },
}

/** Rich heading reveal: each grapheme rises, unblurs and settles with a soft spring. */
export const TEXT_REVEAL = {
  /** Upper bound for the whole stagger so long headings never drag. */
  maxStagger: 0.85,
  perChar: 0.028,
  char: {
    hidden: { opacity: 0, y: '0.6em', rotate: 4, filter: 'blur(8px)' },
    show: {
      opacity: 1, y: '0em', rotate: 0, filter: 'blur(0px)',
      transition: { type: 'spring', stiffness: 420, damping: 28, mass: 0.7, filter: { duration: 0.42, ease: EASE.out }, opacity: { duration: 0.3, ease: EASE.out } },
    },
  } satisfies Variants,
} as const

/** Scroll entrance for cards/sections (used by InteractionMotion). */
export const SCROLL_REVEAL = {
  from: { opacity: 0, y: 26, scale: 0.97 },
  duration: 0.6,
  stagger: 0.06,
  maxStagger: 6,
} as const
