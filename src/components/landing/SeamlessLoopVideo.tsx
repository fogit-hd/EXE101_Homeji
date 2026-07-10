import { useEffect, useRef } from 'react'
import './SeamlessLoopVideo.css'

type Props = {
  className?: string
  poster?: string
  srcMp4?: string
  srcWebm?: string
}

/**
 * Seamless ambient loop: soft-restart just before EOF to avoid the native
 * `loop` hitch, on a boomerang-encoded clip (forward+reverse) so end≈start.
 */
export function SeamlessLoopVideo({
  className = '',
  poster = '/landing/campus-poster.svg',
  srcMp4 = '/landing/campus-loop.mp4',
  srcWebm = '/landing/campus-loop.webm',
}: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return

    video.muted = true
    video.playsInline = true
    video.loop = false

    const onTimeUpdate = () => {
      // Restart a few frames early — avoids blank flash from native loop seek.
      if (video.duration && video.currentTime >= video.duration - 0.05) {
        video.currentTime = 0.04
      }
    }

    const onEnded = () => {
      video.currentTime = 0.04
      void video.play().catch(() => {})
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)
    void video.play().catch(() => {})

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
      video.pause()
    }
  }, [srcMp4, srcWebm])

  return (
    <video
      ref={ref}
      className={`seamless-loop-video ${className}`.trim()}
      muted
      playsInline
      preload="auto"
      poster={poster}
      aria-hidden="true"
    >
      <source src={srcMp4} type="video/mp4" />
      <source src={srcWebm} type="video/webm" />
    </video>
  )
}
