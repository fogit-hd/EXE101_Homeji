/** Keep recovery inside Homeji, including when the query string is user supplied. */
export function profileReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')
    || [...value].some(character => character.charCodeAt(0) <= 32)) return null
  try {
    const url = new URL(value, 'https://homeji.invalid')
    if (url.origin !== 'https://homeji.invalid' || url.pathname === '/profile' || url.searchParams.get('section') === 'profile') return null
    return url.pathname + url.search + url.hash
  } catch { return null }
}

export function profileSetupUrl(returnTo: string): string {
  const params = new URLSearchParams({ section: 'profile', profileTab: 'basic' })
  const destination = profileReturnTo(returnTo)
  if (destination) params.set('returnTo', destination)
  return '/?' + params.toString()
}
