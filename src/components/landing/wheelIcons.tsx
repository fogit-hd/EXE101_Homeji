/**
 * Hand-drawn Homeji icons for the listing action wheel. Each is a small
 * multi-colour illustration on a 32×32 grid; a soft white outline keeps it
 * legible on both the pale item and the saturated active item.
 */
const OUTLINE = { stroke: '#fff', strokeWidth: 1.6, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const }

/** A small house seen through a magnifying glass. */
export function ViewRoomIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="hj-wi-roof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff9a76" /><stop offset="1" stopColor="#f0603e" /></linearGradient>
        <radialGradient id="hj-wi-lens" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9f3ee" /></radialGradient>
      </defs>
      <path d="M7 14.5V25a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 23 25V14.5L15 8Z" fill="#fff4e3" {...OUTLINE} />
      <path d="M4.2 15.8 15 6.6l10.8 9.2-1.6 1.7L15 9.8l-9.2 7.7Z" fill="url(#hj-wi-roof)" />
      <rect x="12.2" y="18.5" width="5" height="8" rx="1.2" fill="#14b8a6" />
      <rect x="9" y="15.5" width="3" height="3" rx=".6" fill="#ffd166" />
      <circle cx="21.5" cy="21.5" r="5.6" fill="url(#hj-wi-lens)" stroke="#0f8f84" strokeWidth="2.2" />
      <path d="M19 19.6a3 3 0 0 1 2.4-1.2" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="m25.6 25.6 3.4 3.4" stroke="#0f8f84" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** A dotted route that ends at a Homeji pin. */
export function DirectionsIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="hj-wi-pin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff8f6b" /><stop offset="1" stopColor="#e94e3c" /></linearGradient>
      </defs>
      <ellipse cx="22" cy="27.2" rx="5" ry="1.6" fill="#0f2f2a" opacity=".18" />
      <path d="M5.5 25c2.5-5 9-3 10.5-8.5S11 9.5 9 7" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 4" />
      <circle cx="5.5" cy="25" r="2.6" fill="#22c55e" {...OUTLINE} />
      <circle cx="5.5" cy="25" r="1" fill="#fff" />
      <path d="M22 26.5s-6.5-6.4-6.5-11.2a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11.2-6.5 11.2Z" fill="url(#hj-wi-pin)" {...OUTLINE} />
      <circle cx="22" cy="15.2" r="2.7" fill="#fff" />
      <circle cx="22" cy="15.2" r="1.2" fill="#14b8a6" />
      <path d="M18.4 12.2a4 4 0 0 1 2-2" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** A folded paper map with a river and a pin. */
export function AreaMapIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 8.5 11 6l10 2.5L28 6v17.5L21 26l-10-2.5L4 26Z" fill="#fff" {...OUTLINE} />
      <path d="M4 8.5 11 6v17.5L4 26Z" fill="#7ee0a3" />
      <path d="M11 6l10 2.5V26l-10-2.5Z" fill="#c8f5d8" />
      <path d="M21 8.5 28 6v17.5L21 26Z" fill="#5cc9c0" />
      <path d="M4 19c3-1 5 1.5 8.5 0s5.5-3 9-1.5S27 18 28 17" fill="none" stroke="#3aa0e8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 11.5h2M14 12l3 .8M24 11.5l2-.7" stroke="#ffffff" strokeOpacity=".75" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16.5 17.5s-3.6-3.5-3.6-6.2a3.6 3.6 0 0 1 7.2 0c0 2.7-3.6 6.2-3.6 6.2Z" fill="#ff7a59" {...OUTLINE} />
      <circle cx="16.5" cy="11.3" r="1.4" fill="#fff" />
    </svg>
  )
}

/** A paper plane carrying a little heart, leaving a dotted trail. */
export function ShareRoomIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="hj-wi-plane" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
      </defs>
      <path d="M3.5 25.5c2.5-.5 4.5-1.8 6-3.5" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="0.1 3.4" />
      <path d="M28.5 4 5 14.2l7.4 3.1L28.5 4Z" fill="url(#hj-wi-plane)" {...OUTLINE} />
      <path d="M28.5 4 12.4 17.3l1.1 8.2 4-5.2 6.7 3.2Z" fill="#8b5cf6" {...OUTLINE} />
      <path d="m12.4 17.3 1.1 8.2 4-5.2Z" fill="#5b21b6" />
      <path d="M21.6 27.6s-3.6-2.2-3.6-4.6a1.9 1.9 0 0 1 3.6-.9 1.9 1.9 0 0 1 3.6.9c0 2.4-3.6 4.6-3.6 4.6Z" fill="#ff6b8b" {...OUTLINE} />
    </svg>
  )
}
