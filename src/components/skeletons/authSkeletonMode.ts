export function authSkeletonMode(pathname: string, search = '') {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/auth') {
    const section = new URLSearchParams(search).get('section')
    return section === 'register' ? 'register' as const : section === 'forgot-password' ? 'recovery' as const : 'login' as const
  }
  if (path === '/login') return 'login' as const
  if (path === '/register') return 'register' as const
  if (path === '/verify-email') return 'verify' as const
  if (['/forgot-password', '/reset-password', '/auth/callback'].includes(path)) return 'recovery' as const
  return undefined
}
