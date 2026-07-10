import { useEffect, useState } from 'react'

const MAP_ERROR_PATTERNS = [
  /RefererNotAllowedMapError/i,
  /ApiNotActivatedMapError/i,
  /InvalidKeyMapError/i,
  /BillingNotEnabledMapError/i,
  /ApiTargetBlockedMapError/i,
  /Permission Denied/i,
  /Google Maps JavaScript API error:/i,
]

/** Bắt gm_authFailure + console.error từ Google Maps. */
export function useGoogleMapsAuthFailure() {
  const [authFailed, setAuthFailed] = useState(false)
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    const win = window as Window & { gm_authFailure?: () => void }
    const prev = win.gm_authFailure
    win.gm_authFailure = () => {
      setAuthFailed(true)
      setReason((r) => r ?? 'gm_authFailure — key/billing/API restrictions trên Google Cloud.')
    }

    const origError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      const text = args.map(String).join(' ')
      if (MAP_ERROR_PATTERNS.some((p) => p.test(text))) {
        setAuthFailed(true)
        setReason((r) => r ?? text.split('\n')[0])
      }
      origError(...args)
    }

    return () => {
      win.gm_authFailure = prev
      console.error = origError
    }
  }, [])

  return { authFailed, reason }
}
