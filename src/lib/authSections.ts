export const AUTH_SECTIONS = ['login', 'register', 'forgot-password'] as const
export type AuthSection = typeof AUTH_SECTIONS[number]

export function authSection(search: string): AuthSection {
  const value = new URLSearchParams(search).get('section')
  return AUTH_SECTIONS.find(section => section === value) ?? 'login'
}

export function authSectionUrl(section: AuthSection, search = '', hash = ''): string {
  const query = new URLSearchParams(search)
  query.set('section', section)
  return `/auth?${query}${hash}`
}
