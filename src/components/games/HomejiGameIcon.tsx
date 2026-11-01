import { useId } from 'react'

/** Small native vector illustrations keep the game independent of remote assets. */
export function HomejiGameIcon({ kind }: { kind: number }) {
  const id = useId().replaceAll(':', '')
  return <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-teal`} x1="20" y1="15" x2="78" y2="84" gradientUnits="userSpaceOnUse"><stop stopColor="#7ce1b1" /><stop offset="1" stopColor="#087c72" /></linearGradient>
      <linearGradient id={`${id}-clay`} x1="20" y1="35" x2="76" y2="82" gradientUnits="userSpaceOnUse"><stop stopColor="#ffd8a7" /><stop offset="1" stopColor="#d37c4c" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="22" y1="15" x2="77" y2="83" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe8a6" /><stop offset="1" stopColor="#bd873a" /></linearGradient>
    </defs>
    <ellipse cx="48" cy="81" rx="25" ry="5" fill="#0a4c4220" />
    {kind === 0 ? <>
      <path d="M47 57V28" stroke="#1b7460" strokeWidth="5" strokeLinecap="round" />
      <path d="M47 43C25 43 24 28 28 20c16 0 24 9 19 23Zm1-9c-1-17 11-24 23-23 3 15-6 26-23 23Z" fill={`url(#${id}-teal)`} />
      <path d="m28 53 6 25c11 6 20 6 30 0l5-25Z" fill={`url(#${id}-clay)`} />
      <rect x="25" y="49" width="47" height="10" rx="5" fill="#f5bb8b" /><path d="m36 61 3 13" stroke="#fff2d0" strokeWidth="3" strokeLinecap="round" />
    </> : kind === 1 ? <>
      <path d="M54 43 30 68l-1 12 12-1 5-6-2-5 7-1 3-6 8-8" stroke="#99702d" strokeWidth="15" strokeLinejoin="round" />
      <path d="M54 40 29 67l-1 11 11-1 5-6-2-5 7-1 3-6 8-8" stroke={`url(#${id}-gold)`} strokeWidth="12" strokeLinejoin="round" />
      <circle cx="62" cy="31" r="19" fill={`url(#${id}-gold)`} /><circle cx="64" cy="29" r="7" fill="#fbf8e9" /><path d="m33 66 14-15" stroke="#fff1bd" strokeWidth="3" strokeLinecap="round" />
    </> : kind === 2 ? <>
      <ellipse cx="47" cy="77" rx="22" ry="6" fill="#0b635c" /><path d="M48 71V35" stroke="#ce9751" strokeWidth="6" />
      <path d="m34 20-13 32c16 8 38 8 54 0L62 20Z" fill={`url(#${id}-teal)`} /><ellipse cx="48" cy="52" rx="27" ry="6" fill="#a6e1c7" /><path d="m34 24-8 23" stroke="#d9ffdf" strokeWidth="3" strokeLinecap="round" />
    </> : <>
      <path d="M65 39h6c16 0 16 24-1 24h-7" stroke="#7bbfb4" strokeWidth="8" /><path d="M25 34h40v34c0 16-40 16-40 0Z" fill={`url(#${id}-teal)`} />
      <ellipse cx="45" cy="34" rx="20" ry="6" fill="#bce7d7" /><ellipse cx="45" cy="35" rx="15" ry="3" fill="#8b6349" /><path d="M32 44v19" stroke="#d6ffeb" strokeWidth="3" strokeLinecap="round" /><path d="M39 22c-8-8 7-9 1-17m13 17c-7-6 5-8 1-14" stroke="#a9c4b9" strokeWidth="3" strokeLinecap="round" />
    </>}
  </svg>
}
