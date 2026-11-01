import { useEffect, useState } from 'react'

/** Refresh visible inventories without polling hidden tabs. The API cache shares requests. */
export function useCatalogRefresh(enabled = true) {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const refresh = () => { if (!document.hidden) setRevision(value => value + 1) }
    const timer = setInterval(refresh, 65_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [enabled])
  return revision
}
