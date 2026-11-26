import { forwardRef, useRef, type ReactNode } from 'react'
import { motion, useIsPresent } from 'motion/react'
import { DURATION, EASE } from '../../lib/motionTokens'

type Props = { children: ReactNode; direction: number; reduced: boolean; section: string }

export const AuthSectionPanel = forwardRef<HTMLElement, Props>(function AuthSectionPanel({ children, direction, reduced, section }, ref) {
  const present = useIsPresent()
  const node = useRef<HTMLElement | null>(null)
  return <motion.section ref={element => {
    node.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }} custom={direction}
    variants={{ enter: { opacity: 0 }, visible: { opacity: 1, transition: { duration: reduced ? 0 : DURATION.base, delay: reduced ? 0 : .08, ease: EASE.out } }, exit: { opacity: 0, transition: { duration: reduced ? 0 : DURATION.press, ease: EASE.out } } }}
    initial="enter" animate="visible" exit="exit" className="auth-unified__section" data-auth-section={section}
    inert={!present} aria-hidden={!present}
    transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE.out }}
    onAnimationComplete={() => { if (present && node.current?.dataset.authSection === section) node.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }) }}>
    {children}
  </motion.section>
})
