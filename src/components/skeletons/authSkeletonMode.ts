export function authSkeletonMode(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/login') return 'login' as const
  if (path === '/register') return 'register' as const
  if (path === '/verify-email') return 'verify' as const
  if (['/forgot-password', '/reset-password', '/auth/callback'].includes(path)) return 'recovery' as const
  return undefined
}
