import { useEffect, useState } from 'react'
import { filtersSignature, type ListingQuery } from './listingAdapters'
import { countFilterResults } from './filterResultPreview'

const INPUT_DELAY_MS = 300

export function useFilterResultCount(open: boolean, query: ListingQuery) {
  const key = filtersSignature(query)
  const [result, setResult] = useState<{ key: string; count: number | null } | null>(null)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    let active = true
    const timer = window.setTimeout(() => {
      setResult(null)
      void countFilterResults(query, controller.signal).then(count => {
        if (active && !controller.signal.aborted) setResult({ key, count })
      }).catch(() => {
        if (active && !controller.signal.aborted) setResult({ key, count: null })
      })
    }, INPUT_DELAY_MS)
    return () => { active = false; window.clearTimeout(timer); controller.abort() }
  }, [open, key, query])
  const current = result?.key === key ? result : null
  return { count: current?.count ?? null, pending: open && current === null, failed: current !== null && current.count === null }
}
