import { useEffect, useState, type ReactNode } from 'react'
import './SteveSplash.css'

const SPLASH_MS = 15_000
const STEVE_IMG = '/prank/hinhsteve.jpg'

/** One-shot prank splash for the tester — then app continues as usual. */
export function SteveSplash({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <>
      {children}
      {visible ? (
        <div className="steve-splash" role="dialog" aria-label="Chào Steve">
          <img
            className="steve-splash__img"
            src={STEVE_IMG}
            alt="Steve đang nằm trên giường"
          />
          <p className="steve-splash__text">
            hí lô sì típ nha, tui đang nằm trên giường rồi nè, thật ra là tui tắt máy nãy giờ rồi ahihi, đợi 15 giây để dô xem nha :3
          </p>
        </div>
      ) : null}
    </>
  )
}
