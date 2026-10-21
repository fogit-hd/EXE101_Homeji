import {
  createContext, useContext,
  useEffect, useLayoutEffect, useRef
} from 'react'

export type NetworkStatus = 'online' | 'offline' | 'reconnecting'

export type NetworkStatusContextValue = {
  status: NetworkStatus
  isOnline: boolean
}

export const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null)

export const reconnectListeners = new Set<() => void>()

export function useNetworkStatus() {
  const ctx = useContext(NetworkStatusContext)
  if (!ctx) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider')
  }
  return ctx
}

export function useOnReconnect(callback: () => void) {
  const cbRef = useRef(callback)
  useLayoutEffect(() => { cbRef.current = callback }, [callback])
  useEffect(() => {
    const wrap = () => cbRef.current()
    reconnectListeners.add(wrap)
    return () => {
      reconnectListeners.delete(wrap)
    }
  }, [])
}
