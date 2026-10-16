export function isAuthIntroPage(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/login' || path === '/register'
}

/** Guest landing keeps its original pace; application reloads run twice as fast. */
export function brandIntroPlaybackRate(pathname: string, hasSession: boolean): number {
  const path = pathname.replace(/\/+$/, '') || '/'
  return isAuthIntroPage(path) || (path === '/' && !hasSession) ? 1 : 2
}
