import { lazy, Suspense, useState } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'

const MemoryGame = lazy(() => import('./MemoryGame'))

export function GameLauncher({ waiting = false, className = '' }: { waiting?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return <>
    <button type="button" className={`homeji-game-launcher ${className}`} aria-haspopup="dialog" aria-label="Chơi một chút" onClick={() => { setLoaded(true); setOpen(true) }}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="5" /><path d="M7 10v6m-3-3h6m6-2h.01M19 15h.01M9 6V3h6v3" /></svg><span className="homeji-game-launcher__label">Chơi một chút</span>
    </button>
    {loaded ? <ErrorBoundary fallback={<span role="alert">Chưa mở được trò chơi. Tải lại trang để thử lại.</span>}>
      <Suspense fallback={<span role="status">Đang mở trò chơi…</span>}><MemoryGame open={open} waiting={waiting} onClose={() => setOpen(false)} /></Suspense>
    </ErrorBoundary> : null}
  </>
}
