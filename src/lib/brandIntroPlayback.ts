export function isAuthIntroPage(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/login' || path === '/register'
}

/** Match the pre-paint gate in index.html: home deep links are application views. */
export function isBrandIntroLanding(location: { pathname: string; search: string; hash: string }): boolean {
  return location.pathname === '/' && !location.search && !location.hash
}

/** Only the first guest landing keeps its original pace; repeat home intros run at 3x. */
export function brandIntroPlaybackRate(pathname: string, hasSession: boolean, hasSeenIntro = false): number {
  const path = pathname.replace(/\/+$/, '') || '/'
  return isAuthIntroPage(path) || (path === '/' && !hasSession && !hasSeenIntro) ? 1 : 3
}
