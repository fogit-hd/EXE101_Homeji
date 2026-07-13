import { apiRequest } from './client'
import type {
  AccountMessage,
  AuthSession,
  AuthUrl,
  EmailAvailabilityResult,
  MomoPaymentResponse,
  Notification,
  PayOsPaymentResponse,
  Payment,
  PetPreference,
  RentalPost,
  RentalPostSearchParams,
  RentalPostSummary,
  Report,
  ReportStatus,
  RentalPostType,
  RoommateCandidate,
  RoommateInvitation,
  SleepHabit,
  SmokingPreference,
  UserProfile,
} from './types'
import { MediaType, ReportTargetType, UserRole } from './types'

export * from './client'
export * from './types'

// Account
export const register = (data: { email: string; password: string; displayName: string; redirectTo?: string }) =>
  apiRequest<AuthSession>('/api/account/register', { method: 'POST', body: data, auth: false })

export const login = (data: { email: string; password: string }) =>
  apiRequest<AuthSession>('/api/account/login', { method: 'POST', body: data, auth: false })

export const forgotPassword = (data: { email: string; redirectTo?: string }) =>
  apiRequest<AccountMessage>('/api/account/forgot-password', { method: 'POST', body: data, auth: false })

export const resetPassword = (data: { accessToken: string; newPassword: string }) =>
  apiRequest<AccountMessage>('/api/account/reset-password', { method: 'POST', body: data, auth: false })

export const getGoogleLoginUrl = (redirectTo?: string) =>
  apiRequest<AuthUrl>('/api/account/google/url', { auth: false, params: { redirectTo } })

/** Kiểm tra email đã tồn tại chưa (intro signup). */
export const checkEmail = (data: { email: string }) =>
  apiRequest<EmailAvailabilityResult>('/api/account/email-availability', {
    method: 'GET',
    params: { email: data.email },
    auth: false,
  })

export function isEmailTaken(result: EmailAvailabilityResult): boolean {
  if (typeof result.exists === 'boolean') return result.exists
  if (typeof result.available === 'boolean') return !result.available
  return false
}

// Profile
export const getMyProfile = () => apiRequest<UserProfile>('/api/profile/me')

export const updateMyProfile = (data: {
  displayName?: string
  phone?: string
  avatarPath?: string
  school?: string
  preferredArea?: string
}) => apiRequest<UserProfile>('/api/profile/me', { method: 'PUT', body: data })

export const updateMyLifestyle = (data: {
  role: UserRole
  sleepHabit: SleepHabit
  petPreference: PetPreference
  smokingPreference: SmokingPreference
  maxBudget?: number
  preferredArea?: string
}) => apiRequest<UserProfile>('/api/profile/me/lifestyle', { method: 'PUT', body: data })

// Rental Posts
export const searchRentalPosts = (
  params: RentalPostSearchParams = {},
  options?: { auth?: boolean },
) =>
  apiRequest<RentalPostSummary[]>('/api/rental-posts', {
    params: params as RentalPostSearchParams & Record<string, string | number | boolean | string[] | undefined>,
    auth: options?.auth,
  })

export const getRentalPost = (postId: string, options?: { auth?: boolean }) =>
  apiRequest<RentalPost>(`/api/rental-posts/${postId}`, { auth: options?.auth })

export const createRentalPostDraft = (type: RentalPostType) =>
  apiRequest<RentalPost>('/api/rental-posts/drafts', { method: 'POST', body: { type } })

export const updateRentalPost = (postId: string, data: {
  type: RentalPostType
  title?: string
  description?: string
  price: number
  deposit: number
  area: number
  address?: string
  latitude: number
  longitude: number
  amenities: string[]
}) => apiRequest<RentalPost>(`/api/rental-posts/${postId}`, { method: 'PUT', body: data })

export const addRentalPostMedia = (postId: string, data: {
  mediaType: MediaType
  bucket?: string
  path?: string
  isThumbnail: boolean
  sortOrder: number
}) => apiRequest<RentalPost>(`/api/rental-posts/${postId}/media`, { method: 'POST', body: data })

export const deleteRentalPostMedia = (postId: string, mediaId: string) =>
  apiRequest<void>(`/api/rental-posts/${postId}/media/${mediaId}`, { method: 'DELETE' })

export const submitRentalPost = (postId: string) =>
  apiRequest<RentalPost>(`/api/rental-posts/${postId}/submit`, { method: 'POST' })

export const archiveRentalPost = (postId: string) =>
  apiRequest<void>(`/api/rental-posts/${postId}/archive`, { method: 'POST' })

// Saved Posts
export const getSavedPosts = () => apiRequest<RentalPostSummary[]>('/api/saved-posts')

export const savePost = (postId: string) =>
  apiRequest<void>(`/api/saved-posts/${postId}`, { method: 'PUT' })

export const unsavePost = (postId: string) =>
  apiRequest<void>(`/api/saved-posts/${postId}`, { method: 'DELETE' })

export const getRoommateCandidates = (postId: string) =>
  apiRequest<RoommateCandidate[]>(`/api/saved-posts/${postId}/roommate-candidates`)

// Roommate Invitations
export const getMyInvitations = () => apiRequest<RoommateInvitation[]>('/api/roommate-invitations/mine')

export const createInvitation = (postId: string, receiverId: string) =>
  apiRequest<RoommateInvitation>(`/api/roommate-invitations/rental-posts/${postId}`, {
    method: 'POST',
    body: { receiverId },
  })

export const acceptInvitation = (invitationId: string) =>
  apiRequest<RoommateInvitation>(`/api/roommate-invitations/${invitationId}/accept`, { method: 'POST' })

export const rejectInvitation = (invitationId: string) =>
  apiRequest<RoommateInvitation>(`/api/roommate-invitations/${invitationId}/reject`, { method: 'POST' })

export const cancelInvitation = (invitationId: string) =>
  apiRequest<RoommateInvitation>(`/api/roommate-invitations/${invitationId}/cancel`, { method: 'POST' })

// Notifications
export const getNotifications = (unreadOnly = false) =>
  apiRequest<Notification[]>('/api/notifications', { params: { unreadOnly } })

export const markNotificationRead = (notificationId: string) =>
  apiRequest<Notification>(`/api/notifications/${notificationId}/read`, { method: 'POST' })

export const markAllNotificationsRead = () =>
  apiRequest<void>('/api/notifications/read-all', { method: 'POST' })

// Reports
export const createReport = (data: {
  targetType: ReportTargetType
  targetId: string
  reason?: string
  description?: string
}) => apiRequest<Report>('/api/reports', { method: 'POST', body: data })

// Payments
export const getPayment = (paymentId: string) =>
  apiRequest<Payment>(`/api/payments/${paymentId}`)

export const getPaymentByOrderCode = (orderCode: string) =>
  apiRequest<Payment>(`/api/payments/orders/${orderCode}`)

export const createMomoPayment = (amount: number, description?: string) =>
  apiRequest<MomoPaymentResponse>('/api/payments/momo/create', {
    method: 'POST',
    body: { amount, description },
  })

export const createPayOsPayment = (amount: number, description?: string) =>
  apiRequest<PayOsPaymentResponse>('/api/payments/payos/create', {
    method: 'POST',
    body: { amount, description },
  })

// Admin Moderation
export const getPendingRentalPosts = () =>
  apiRequest<RentalPostSummary[]>('/api/admin/moderation/rental-posts/pending')

export const approveRentalPost = (postId: string) =>
  apiRequest<RentalPost>(`/api/admin/moderation/rental-posts/${postId}/approve`, { method: 'POST' })

export const rejectRentalPost = (postId: string, reason?: string) =>
  apiRequest<RentalPost>(`/api/admin/moderation/rental-posts/${postId}/reject`, {
    method: 'POST',
    body: { reason },
  })

export const getAdminReports = (status?: ReportStatus) =>
  apiRequest<Report[]>('/api/admin/moderation/reports', { params: { status } })

export const resolveReport = (reportId: string, resolutionNote?: string) =>
  apiRequest<Report>(`/api/admin/moderation/reports/${reportId}/resolve`, {
    method: 'POST',
    body: { resolutionNote },
  })

export const rejectReport = (reportId: string, resolutionNote?: string) =>
  apiRequest<Report>(`/api/admin/moderation/reports/${reportId}/reject`, {
    method: 'POST',
    body: { resolutionNote },
  })
