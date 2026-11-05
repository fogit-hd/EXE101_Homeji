import type { ReactNode } from 'react'

type Action = 'directions' | 'nearby' | 'share' | 'details'

const paths: Record<Action, ReactNode> = {
  directions: <><path d="m12 3 9 9-9 9-9-9 9-9Z" /><path d="M8 15v-4h7m-3-3 3 3-3 3" /></>,
  nearby: <><path d="M17.5 10c0 4.2-5.5 9.5-5.5 9.5S6.5 14.2 6.5 10a5.5 5.5 0 0 1 11 0Z" /><circle cx="12" cy="10" r="1.8" /><path d="M5 17.5c-1.2.5-2 1.1-2 1.8C3 20.8 7 22 12 22s9-1.2 9-2.7c0-.7-.8-1.3-2-1.8" /></>,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.7 7.6-4.4m-7.6 7 7.6 4.4" /></>,
  details: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6m-6 4h6m-6 4h4" /></>,
}

/** Small inline vectors stay sharp at every zoom and use the button's contrast color. */
export function MapDetailActionIcon({ action }: { action: Action }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[action]}</svg>
}
