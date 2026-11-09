/**
 * Hand-drawn illustrations for the shared-room tab. Pure SVG in the Homeji
 * palette (teal, green, amber, coral, violet); decorative only.
 */

/** Two housemates sharing a sofa under a window, with a plant and a lamp. */
export function RoommateSceneArt() {
  return (
    <svg className="rm-art" viewBox="0 0 280 200" aria-hidden="true">
      <defs>
        <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bdf0ea" /><stop offset="1" stopColor="#fff3df" /></linearGradient>
        <linearGradient id="rm-sofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2dc6b4" /><stop offset="1" stopColor="#0f9488" /></linearGradient>
        <radialGradient id="rm-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffd166" stopOpacity=".7" /><stop offset="1" stopColor="#ffd166" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="140" cy="182" rx="122" ry="10" fill="#0f2f2a" opacity=".08" />
      {/* Window with skyline */}
      <rect x="84" y="18" width="112" height="78" rx="14" fill="url(#rm-sky)" stroke="#fff" strokeWidth="4" />
      <path d="M96 84v-20h12v-10h10v30M126 84V58h14v26M148 84V66h10v-8h12v26M176 84V70h10v14" fill="#9fd9cf" />
      <circle cx="176" cy="38" r="9" fill="#ffd166" />
      <path d="M140 18v78M84 57h112" stroke="#fff" strokeWidth="4" />
      {/* Lamp */}
      <circle cx="238" cy="70" r="34" fill="url(#rm-glow)" />
      <path d="M238 82v84M226 170h24" stroke="#c98a4a" strokeWidth="4" strokeLinecap="round" />
      <path d="M224 82h28l-6-22h-16Z" fill="#ff9a76" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      {/* Plant */}
      <path d="M34 150c-10-18-6-34 4-44M38 150c2-20 14-32 26-34M36 150c-14-6-22-18-22-30" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="38" cy="104" rx="7" ry="12" transform="rotate(-20 38 104)" fill="#4ade80" />
      <ellipse cx="62" cy="116" rx="7" ry="12" transform="rotate(60 62 116)" fill="#22c55e" />
      <ellipse cx="16" cy="120" rx="6" ry="11" transform="rotate(-50 16 120)" fill="#86efac" />
      <path d="M22 150h32l-4 26H26Z" fill="#ff7a59" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      {/* Sofa */}
      <rect x="70" y="112" width="140" height="44" rx="18" fill="url(#rm-sofa)" />
      <rect x="62" y="128" width="26" height="40" rx="12" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
      <rect x="192" y="128" width="26" height="40" rx="12" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
      <rect x="80" y="142" width="120" height="24" rx="10" fill="#5eead4" />
      <path d="M84 166v10M196 166v10" stroke="#0f766e" strokeWidth="4" strokeLinecap="round" />
      {/* Housemate 1: reading */}
      <circle cx="114" cy="96" r="13" fill="#f6c7a1" />
      <path d="M101 93c0-12 9-18 17-17 8 1 12 8 11 14-6-5-17-6-28 3Z" fill="#3b2a24" />
      <path d="M96 146c0-22 8-36 18-36s18 14 18 36Z" fill="#ff7a59" />
      <rect x="102" y="120" width="26" height="18" rx="3" fill="#fff" transform="rotate(-8 115 129)" />
      <path d="M115 121v17" stroke="#ffd166" strokeWidth="2" transform="rotate(-8 115 129)" />
      {/* Housemate 2: waving, holding a mug */}
      <circle cx="166" cy="96" r="13" fill="#d9a07a" />
      <path d="M153 96c-1-10 6-17 14-17s14 6 13 15c-3-4-8-6-13-5-5 0-10 3-14 7Z" fill="#1f2937" />
      <path d="M148 146c0-22 8-36 18-36s18 14 18 36Z" fill="#8b5cf6" />
      <path d="M182 120c6-6 10-14 12-22" stroke="#d9a07a" strokeWidth="7" strokeLinecap="round" />
      <rect x="150" y="126" width="12" height="12" rx="3" fill="#ffd166" stroke="#fff" strokeWidth="1.5" />
      <path d="M154 120c-2-3 2-4 0-7M159 120c-2-3 2-4 0-7" stroke="#9fd9cf" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Hearts and sparkles */}
      <path d="M140 74s-7-4.4-7-9a3.6 3.6 0 0 1 7-1.6 3.6 3.6 0 0 1 7 1.6c0 4.6-7 9-7 9Z" fill="#ff6b8b" stroke="#fff" strokeWidth="1.5" />
      <path d="M58 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#ffd166" />
      <path d="M220 24l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#a78bfa" />
    </svg>
  )
}

/** An open door with a key: shown when no post matches. */
export function RoommateEmptyArt() {
  return (
    <svg className="rm-empty__art" viewBox="0 0 160 120" aria-hidden="true">
      <ellipse cx="80" cy="110" rx="58" ry="6" fill="#0f2f2a" opacity=".08" />
      <rect x="44" y="14" width="56" height="94" rx="6" fill="#fff3df" stroke="#ffb38f" strokeWidth="3" />
      <path d="M48 18h30l14 6v80l-14 4H48Z" fill="#ff8f6b" />
      <circle cx="84" cy="64" r="3.5" fill="#ffd166" />
      <path d="M100 30l14-6v80l-14 4" fill="#bdf0ea" stroke="#5cc9c0" strokeWidth="2" />
      <circle cx="124" cy="44" r="10" fill="none" stroke="#14b8a6" strokeWidth="5" />
      <path d="M124 54v26M124 70h7M124 78h5" stroke="#14b8a6" strokeWidth="5" strokeLinecap="round" />
      <path d="M26 40l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5Z" fill="#a78bfa" />
      <path d="M140 18l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2Z" fill="#ffd166" />
    </svg>
  )
}

/** One seat in the room: filled when someone already lives there. */
export function SeatIcon({ taken }: { taken: boolean }) {
  return (
    <svg className="rm-seat" data-taken={taken || undefined} viewBox="0 0 24 24" aria-hidden="true">
      {taken ? <>
        <circle cx="12" cy="8" r="4.2" fill="currentColor" />
        <path d="M4.5 21c0-4.6 3.4-7.6 7.5-7.6s7.5 3 7.5 7.6Z" fill="currentColor" />
      </> : <>
        <circle cx="12" cy="8" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.2 2" />
        <path d="M4.5 21c0-4.6 3.4-7.6 7.5-7.6s7.5 3 7.5 7.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.2 2" />
        <path d="M12 6.4v3.2M10.4 8h3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>}
    </svg>
  )
}
