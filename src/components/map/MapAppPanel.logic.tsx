export type MapAppSection =
  | 'listings'
  | 'saved'
  | 'invitations'
  | 'notifications'
  | 'messages'
  | 'appointments'
  | 'payments'
  | 'profile'
  | 'marketplace'
  | 'wanted'
  | 'activities'
  | 'myPosts'

export const WIDE_MAP_SECTIONS = new Set<MapAppSection>([
  'marketplace',
  'saved',
  'notifications',
  'appointments',
  'wanted',
  'invitations',
  'myPosts',
  'activities',
  'profile',
  'payments',
])

export function isWideMapSection(section: MapAppSection | null | undefined): boolean {
  return Boolean(section && WIDE_MAP_SECTIONS.has(section))
}
