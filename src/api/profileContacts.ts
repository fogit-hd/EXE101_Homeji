import { apiRequest } from './client'
export type ProfileSocialContacts = { facebookUrl: string | null; zaloPhone: string | null; createdAt: string; isPremium: boolean; premiumExpiresAt: string | null }
export type PublicContactProfile = Pick<ProfileSocialContacts, 'facebookUrl' | 'zaloPhone' | 'createdAt' | 'isPremium'> & { id: string; displayName: string; avatarPath: string | null }
export const getMySocialContacts = (signal?: AbortSignal) => apiRequest<ProfileSocialContacts>('/api/profile/me/social-contacts', { signal })
export const updateMySocialContacts = (body: { facebookUrl: string | null; zaloPhone: string | null }) => apiRequest<ProfileSocialContacts>('/api/profile/me/social-contacts', { method: 'PUT', body })
export const getPublicContactProfile = (userId: string, signal?: AbortSignal) => apiRequest<PublicContactProfile>(`/api/profile/${encodeURIComponent(userId)}`, { signal })
