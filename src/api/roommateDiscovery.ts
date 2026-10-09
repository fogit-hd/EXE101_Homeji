import { apiRequest } from './client'
import type { PetPreference, RoommateInvitation, SleepHabit, SmokingPreference } from './types'

export const RoommateIntent = { SeekingAccommodation: 1, HasAccommodation: 2 } as const
export type RoommateIntent = (typeof RoommateIntent)[keyof typeof RoommateIntent]

export interface RoommateDiscoveryProfile {
  intent: RoommateIntent
  isDiscoverable: boolean
  introduction: string | null
}

export interface RoommatePerson {
  intent: RoommateIntent
  introduction: string | null
  userId: string
  displayName: string
  avatarPath: string | null
  school: string | null
  preferredArea: string | null
  maxBudget: number | null
  sleepHabit: SleepHabit
  petPreference: PetPreference
  smokingPreference: SmokingPreference
  compatibilityScore: number | null
}

export interface RoommateDirectory {
  items: RoommatePerson[]
  totalCount: number
  page: number
  pageSize: number
}

export const getMyRoommateProfile = (signal?: AbortSignal) =>
  apiRequest<RoommateDiscoveryProfile>('/api/roommates/me', { signal })

export const updateMyRoommateProfile = (data: RoommateDiscoveryProfile) =>
  apiRequest<RoommateDiscoveryProfile>('/api/roommates/me', { method: 'PUT', body: data })

export const searchRoommates = (params: { intent?: RoommateIntent; keyword?: string; page: number; pageSize: number }, signal?: AbortSignal) =>
  apiRequest<RoommateDirectory>('/api/roommates', { params, signal })

export const inviteRoommate = (receiverId: string) =>
  apiRequest<RoommateInvitation>('/api/roommate-invitations', { method: 'POST', body: { receiverId } })
