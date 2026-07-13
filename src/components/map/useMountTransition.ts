import { useEffect, useState } from 'react'

/** Keep an element mounted through exit animation. */
export function useMountTransition(open: boolean, durationMs = 280) {
  const [mounted, setMounted] = useState(open)
  const [active, setActive] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setActive(true))
      })
      return () => window.cancelAnimationFrame(id)
    }

    setActive(false)
    const t = window.setTimeout(() => setMounted(false), durationMs)
    return () => window.clearTimeout(t)
  }, [open, durationMs])

  return { mounted, active }
}
