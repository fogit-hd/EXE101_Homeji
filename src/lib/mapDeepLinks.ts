import { createElement, useMemo } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'

/** Paths that only exist to bounce into map home + a panel section. */
export const MAP_SECTION_REDIRECT_PATHS = [
  '/my-posts',
  '/marketplace',
  '/wanted',
  '/activities',
  '/saved',
  '/profile',
  '/notifications',
  '/invitations',
  '/payments',
] as const

export function isMapSectionRedirectPath(pathname: string): boolean {
  return (MAP_SECTION_REDIRECT_PATHS as readonly string[]).includes(pathname)
}

/**
 * Build `/?section=…` while keeping gateway return query (paymentId, orderCode, …).
 * Also normalizes MoMo `orderId` → `orderCode` for PaymentPage lookup.
 */
export function mapSectionDeepLink(
  section: string,
  search: string | URLSearchParams = '',
): string {
  const incoming =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : new URLSearchParams(search)

  const next = new URLSearchParams()
  next.set('section', section)

  for (const [key, value] of incoming.entries()) {
    if (key === 'section' || key === 'post') continue
    next.set(key, value)
  }

  // MoMo return often uses orderId; PaymentPage reads orderCode.
  if (!next.get('orderCode')) {
    const momoOrder = incoming.get('orderId')
    if (momoOrder) next.set('orderCode', momoOrder)
  }

  const qs = next.toString()
  return qs ? `/?${qs}` : `/?section=${encodeURIComponent(section)}`
}

/** Legacy standalone app pages → map home + panel section (keep return-url query). */
export function MapHomeSectionRedirect({ section }: { section: string }) {
  const location = useLocation()
  const to = useMemo(
    () => mapSectionDeepLink(section, location.search),
    [section, location.search],
  )
  return createElement(Navigate, { to, replace: true })
}

/** Legacy `/posts/:postId` detail page → map home with listing selected. */
export function MapHomePostRedirect() {
  const { postId } = useParams<{ postId: string }>()
  if (!postId) return createElement(Navigate, { to: '/', replace: true })
  return createElement(Navigate, {
    to: `/?post=${encodeURIComponent(postId)}`,
    replace: true,
  })
}

export function mapPostUrl(postId: string): string {
  return `/?post=${encodeURIComponent(postId)}`
}

export function mapSectionUrl(section: string): string {
  return `/?section=${encodeURIComponent(section)}`
}
