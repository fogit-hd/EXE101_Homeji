import { useEffect, useRef } from 'react'
import { MembershipCrown } from './MembershipCrown'
import './UserPremiumBadge.css'

export function UserPremiumBadge({ compact = false }: { compact?: boolean }) {
  const host = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let disposed = false
    let effects: { destroy(): void } | undefined
    const element = host.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const forced = matchMedia('(forced-colors: active)')
    const start = () => {
      if (!element || disposed || effects || reduced.matches || forced.matches) return
      void import('./membership-effects.mjs').then(({ mountMaterials }) => {
        if (!disposed && !effects && !reduced.matches && !forced.matches) effects = mountMaterials([element])
      })
    }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) start() })
    if (element) observer.observe(element)
    reduced.addEventListener('change', start)
    forced.addEventListener('change', start)
    return () => { disposed = true; observer.disconnect(); effects?.destroy(); reduced.removeEventListener('change', start); forced.removeEventListener('change', start) }
  }, [])
  return <span ref={host} className="membership-badge" data-material="3" data-outside="true" aria-label="Thành viên Premium" title="Thành viên Premium">
    <span className="chat-premium"><i className="membership-badge__sheen" aria-hidden="true" /><span className="chat-premium__crown" aria-hidden="true"><MembershipCrown /></span><span className="chat-premium__label">{compact ? 'PRO' : 'Premium'}</span></span>
  </span>
}
