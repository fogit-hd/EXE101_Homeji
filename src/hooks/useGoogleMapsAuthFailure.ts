import { useEffect, useState } from 'react'

const MAP_ERROR_PATTERNS = [
  /RefererNotAllowedMapError/i,
  /ApiNotActivatedMapError/i,
  /InvalidKeyMapError/i,
  /BillingNotEnabledMapError/i,
  /ApiTargetBlockedMapError/i,
  /Permission Denied/i,
  /Google Maps JavaScript API error:/i,
  /REQUEST_DENIED/i,
]

function extractMapsReason(text: string): string {
  const code =
    text.match(
      /(BillingNotEnabledMapError|ApiNotActivatedMapError|InvalidKeyMapError|RefererNotAllowedMapError|ApiTargetBlockedMapError)/i,
    )?.[1] ?? null
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean) ?? text
  return code ? `${code}: ${firstLine}` : firstLine
}

/** Bắt gm_authFailure + console.error từ Google Maps. */
export function useGoogleMapsAuthFailure() {
  const [authFailed, setAuthFailed] = useState(false)
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    const win = window as Window & { gm_authFailure?: () => void }
    const prev = win.gm_authFailure
    win.gm_authFailure = () => {
      setAuthFailed(true)
      setReason(
        (r) =>
          r ??
          'gm_authFailure — Google từ chối API key (thường Billing / API chưa bật / restriction).',
      )
    }

    const origError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      const text = args.map(String).join(' ')
      if (MAP_ERROR_PATTERNS.some((p) => p.test(text))) {
        setAuthFailed(true)
        setReason((r) => r ?? extractMapsReason(text))
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
