import { useState } from 'react'
import type { MapsErrorDiagnosis } from '../../lib/googleMapsErrors'
import './RentalMap.css'

type Props = {
  diagnosis: MapsErrorDiagnosis
  report: string
  apiKeyMasked: string
  probing?: boolean
  probeStatus?: string
  className?: string
}

export function MapErrorPanel({
  diagnosis,
  report,
  apiKeyMasked,
  probing,
  probeStatus,
  className = '',
}: Props) {
  const [copied, setCopied] = useState(false)

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select via prompt
      window.prompt('Copy báo lỗi này gửi bạn tạo key:', report)
    }
  }

  return (
    <div className={`map-placeholder-msg map-error-panel ${className}`.trim()}>
      <p className="map-error-panel__title">Không thể hiển thị bản đồ Google Maps</p>
      <p className="map-error-panel__code">
        Mã: <strong>{diagnosis.codes.join(' + ')}</strong>
        {probeStatus ? (
          <>
            {' '}
            · Geocode: <strong>{probeStatus}</strong>
          </>
        ) : null}
        {probing ? ' · đang kiểm tra key…' : null}
      </p>
      <p className="map-placeholder-hint">
        <strong>{diagnosis.title}</strong>
      </p>

      <div className="map-error-panel__box" role="status">
        <div className="map-error-panel__box-label">Message từ Google (gửi bạn tạo key)</div>
        <pre className="map-error-panel__pre">{diagnosis.googleMessage}</pre>
        <div className="map-error-panel__meta">Key: {apiKeyMasked}</div>
      </div>

      <ol className="map-error-panel__steps">
        {diagnosis.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <ul className="map-error-panel__links">
        {diagnosis.consoleLinks.map((link) => (
          <li key={link.url}>
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <button type="button" className="map-error-panel__copy" onClick={() => void copyReport()}>
        {copied ? 'Đã copy báo lỗi' : 'Copy báo lỗi gửi bạn tạo key'}
      </button>
    </div>
  )
}
