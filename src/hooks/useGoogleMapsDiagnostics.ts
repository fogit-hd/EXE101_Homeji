import { useEffect, useMemo, useState } from 'react'
import {
  buildShareableMapsErrorReport,
  diagnoseMapsError,
  maskApiKey,
  probeMapsApiKey,
  type MapsErrorDiagnosis,
} from '../lib/googleMapsErrors'
import { useGoogleMapsAuthFailure } from './useGoogleMapsAuthFailure'

export function useGoogleMapsDiagnostics(
  apiKey: string,
  loadError: Error | undefined,
  mapsFailed: boolean,
) {
  const { authFailed, reason: authReason } = useGoogleMapsAuthFailure()
  const [probeStatus, setProbeStatus] = useState<string | undefined>()
  const [probeError, setProbeError] = useState<string | null | undefined>()
  const [probing, setProbing] = useState(false)

  const failed = Boolean(loadError || mapsFailed || authFailed)

  useEffect(() => {
    if (!failed || !apiKey) return

    let cancelled = false
    setProbing(true)
    void probeMapsApiKey(apiKey).then((result) => {
      if (cancelled) return
      setProbeStatus(result.status)
      setProbeError(result.errorMessage)
      setProbing(false)
    })

    return () => {
      cancelled = true
    }
  }, [failed, apiKey])

  const rawMessage = useMemo(() => {
    const parts = [
      probeError,
      probeStatus && probeStatus !== 'OK' ? `Geocode status: ${probeStatus}` : null,
      loadError?.message,
      authReason,
      authFailed ? 'gm_authFailure / Permission Denied' : null,
    ].filter(Boolean)
    return parts.join('\n') || 'Không tải được Maps JavaScript API.'
  }, [probeError, probeStatus, loadError, authReason, authFailed])

  const diagnosis: MapsErrorDiagnosis = useMemo(
    () => diagnoseMapsError(rawMessage),
    [rawMessage],
  )

  const report = useMemo(
    () =>
      buildShareableMapsErrorReport({
        diagnosis,
        apiKeyMasked: maskApiKey(apiKey),
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        probeStatus,
        probeError,
      }),
    [diagnosis, apiKey, probeStatus, probeError],
  )

  return {
    failed,
    diagnosis,
    report,
    probing,
    probeStatus,
    probeError,
    apiKeyMasked: maskApiKey(apiKey),
  }
}
