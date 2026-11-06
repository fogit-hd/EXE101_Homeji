const STORAGE_KEY = 'homeji-stale-build-reload'
const RETRY_AFTER_MS = 60_000

type ReloadWindow = {
  addEventListener: (type: string, listener: (event: Event) => void) => void
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>
  location: { reload: () => void }
}

/**
 * A tab opened before a deploy still asks for chunks the new build no longer has. Reloading picks up
 * the new file names. One attempt per minute, so a real outage shows the error page instead of looping.
 */
export function installStaleBuildReload(target: ReloadWindow, now: () => number = Date.now) {
  target.addEventListener('vite:preloadError', event => {
    try {
      const last = Number(target.sessionStorage.getItem(STORAGE_KEY) ?? 0)
      if (now() - last < RETRY_AFTER_MS) return
      target.sessionStorage.setItem(STORAGE_KEY, String(now()))
    } catch {
      // Without storage a reload could never be limited, so let the error boundary handle it.
      return
    }
    event.preventDefault()
    target.location.reload()
  })
}
