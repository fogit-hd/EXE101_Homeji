import './ThinkingCapsule.css'

/** Present only while the request is pending; it never captures pointer input. */
export function ThinkingCapsule({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <div className="homeji-assistant__thinking-popup" data-glass-exclude>
    <div className="homeji-assistant__thinking" role="status" aria-live="polite" aria-atomic="true">
      <span className="homeji-assistant__thinking-orb" aria-hidden="true" />
      <span>Homeji đang suy nghĩ<span aria-hidden="true">…</span></span>
    </div>
  </div>
}
