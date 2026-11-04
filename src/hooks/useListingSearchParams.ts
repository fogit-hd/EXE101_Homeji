import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { createSearchParams, useLocation, useSearchParams, type NavigateOptions, type URLSearchParamsInit } from 'react-router-dom'
import { createListingSearchStore, isListingSearchNavigation, mergeListingSearch, splitListingNavigation } from '../lib/listingSearchState'

let store: ReturnType<typeof createListingSearchStore> | undefined
function searchStore() {
  if (!store) {
    let storage: Storage | undefined
    try { storage = window.sessionStorage } catch { /* Memory-only search remains available. */ }
    store = createListingSearchStore(storage)
  }
  return store
}

/** Compatibility adapter for existing controls; criteria never go into the navigation URL. */
export function useListingSearchParams(): [URLSearchParams, (next: URLSearchParamsInit | ((previous: URLSearchParams) => URLSearchParamsInit), options?: NavigateOptions) => void] {
  const [navigation, setNavigation] = useSearchParams()
  const location = useLocation()
  const currentStore = searchStore()
  const criteria = useSyncExternalStore(currentStore.subscribe, currentStore.getSnapshot, currentStore.getSnapshot)
  const listingNavigation = isListingSearchNavigation(navigation, location.pathname)
  const legacy = useMemo(() => splitListingNavigation(navigation), [navigation])
  const migrated = useRef('')
  const params = useMemo(() => listingNavigation ? mergeListingSearch(navigation, criteria) : navigation, [navigation, criteria, listingNavigation])
  // Migrate after the parent router's layout effect has attached its history listener.
  useEffect(() => {
    if (!listingNavigation) return
    const incoming = navigation.toString()
    if (legacy.navigation.toString() === incoming) { migrated.current = ''; return }
    if (migrated.current === incoming) return
    migrated.current = incoming
    currentStore.set(legacy.criteria)
    setNavigation(legacy.navigation, { replace: true })
  }, [navigation, legacy, currentStore, setNavigation, listingNavigation])
  const setParams = useCallback((next: URLSearchParamsInit | ((previous: URLSearchParams) => URLSearchParamsInit), options?: NavigateOptions) => {
    const currentNavigation = listingNavigation ? splitListingNavigation(navigation).navigation : navigation
    const previous = listingNavigation ? mergeListingSearch(currentNavigation, currentStore.getSnapshot()) : new URLSearchParams(navigation)
    const requested = createSearchParams(typeof next === 'function' ? next(previous) : next)
    const split = splitListingNavigation(requested)
    const nextIsListing = isListingSearchNavigation(requested)
    if (nextIsListing) currentStore.set(split.criteria)
    const nextNavigation = nextIsListing || listingNavigation ? split.navigation : requested
    if (nextNavigation.toString() !== currentNavigation.toString()) setNavigation(nextNavigation, options)
  }, [navigation, setNavigation, currentStore, listingNavigation])
  return [params, setParams]
}
