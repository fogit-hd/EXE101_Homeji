import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import { useEffect, useRef, useState } from 'react'

const CONFETTI_SRC = '/lottie/confetti.lottie'

/**
 * Plays once when the user starts scrolling *out* of the mission section
 * (not on enter — waits until the section begins leaving the viewport).
 */
export function MissionConfetti() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<DotLottie | null>(null)
  const enteredRef = useRef(false)
  const playedRef = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mission = document.getElementById('mission')
    if (!mission) return

    const tryPlay = () => {
      if (playedRef.current) return
      playedRef.current = true
      setReady(true)
      requestAnimationFrame(() => {
        playerRef.current?.play()
      })
    }

    const onScroll = () => {
      if (playedRef.current) return

      const r = mission.getBoundingClientRect()
      const vh = window.innerHeight

      // Mark as “seen” only after mission is clearly on screen
      if (!enteredRef.current && r.top < vh * 0.45 && r.bottom > vh * 0.55) {
        enteredRef.current = true
        return
      }

      if (!enteredRef.current) return

      // Leaving downward: top has crossed above the viewport
      // (user starts scrolling out of mission toward journey)
      if (r.top < -vh * 0.08) {
        tryPlay()
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="guest-mission__media" ref={wrapRef} aria-hidden="true">
      {ready && (
        <DotLottieReact
          src={CONFETTI_SRC}
          loop={false}
          autoplay
          dotLottieRefCallback={(instance) => {
            playerRef.current = instance
          }}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
