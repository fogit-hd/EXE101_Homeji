export function isAuthIntroPage(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/login' || path === '/register'
}

/** Only the first guest landing keeps its original pace; subsequent intros run at 3x. */
export function brandIntroPlaybackRate(pathname: string, hasSession: boolean, hasSeenIntro = false): number {
  const path = pathname.replace(/\/+$/, '') || '/'
  return isAuthIntroPage(path) || (path === '/' && !hasSession && !hasSeenIntro) ? 1 : 3
}
