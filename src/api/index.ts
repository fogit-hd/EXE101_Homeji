import { apiDownload, apiRequest, apiUpload } from './client'
import {
  getDefaultNotifications,
  isDefaultNotificationId,
  markAllDefaultNotificationsRead,
  markDefaultNotificationRead,
} from '../lib/defaultNotifications'
import type {
  AccountMessage,
  AiHighlightResponse,
  AiParsedSearchCriteria,
  AdminActiveUser,
  AuthSession,
  AuthUrl,
  ChatbotConversation,
  ChatbotMessage,
  ChatbotPopupConfig,
  ChatbotReply,
  CompareRentalPostsResult,
  EmailAvailabilityResult,
  LandlordVerification,
  MarketplaceListingType,
  MarketplaceOrder,
  MarketplacePost,
  MessageAttachmentContext,
  MomoPaymentResponse,
  MySubscription,
  Notification,
  PayOsPaymentResponse,
  Payment,
  PetPreference,
  PostConversation,
  PostMessage,
  RentalPost,
  RentalPostOwnerStats,
  RentalPostSearchParams,
  RentalPostSummary,
  RentalReview,
  RentalReviewCollection,
  RentalWantedPost,
  Report,
  ReportStatus,
  RentalPostType,
  RoommateCandidate,
  RoommateInvitation,
  RoomTransferKind,
  SleepHabit,
  SmokingPreference,
  SubscriptionPackage,
  UploadImageResult,
  UpsertMarketplacePostInput,
  UpsertRentalReviewInput,
  UpsertRentalWantedPostInput,
  UserActivity,
  UserActivityType,
  UserProfile,
  ViewingAppointment,
  Wallet,
  WalletTransaction,
  WalletWithdrawal,
  WalletWithdrawalStatus,
} from './types'
import { MediaType, ReportTargetType, UserRole } from './types'

export * from './client'
export * from './authSession'
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

export const recordPresence = () =>
  apiRequest<void>('/api/activities/presence', { method: 'POST' })

export const updateMyProfile = (data: {
  displayName?: string
  phone?: string
  avatarPath?: string
  school?: string
  preferredArea?: string
  contactAddress?: string
  rentalNeed?: string
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

export const compareRentalPosts = (postIds: string[]) =>
  apiRequest<CompareRentalPostsResult>('/api/rental-posts/compare', {
    method: 'POST',
    body: { postIds },
  })

export const getMyRentalPostStats = () =>
  apiRequest<RentalPostOwnerStats>('/api/rental-posts/mine/stats')

export const createRentalPostDraft = (type: RentalPostType) =>
  apiRequest<RentalPost>('/api/rental-posts/drafts', { method: 'POST', body: { type } })

export const updateRentalPost = (
  postId: string,
  data: {
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
    electricityPrice?: number
    waterPrice?: number
    internetPrice?: number
    maxOccupants?: number
    availableSlots?: number
    houseRules?: string
    availableFrom?: string
    transferKind?: RoomTransferKind
    originalLeaseEndsOn?: string
    passFee?: number
    transferReason?: string
    ownerConsentConfirmed?: boolean
    ownerConsentContact?: string
  },
) => apiRequest<RentalPost>(`/api/rental-posts/${postId}`, { method: 'PUT', body: data })

export const addRentalPostMedia = (
  postId: string,
  data: {
    mediaType: MediaType
    bucket?: string
    path?: string
    isThumbnail: boolean
    sortOrder: number
  },
) => apiRequest<RentalPost>(`/api/rental-posts/${postId}/media`, { method: 'POST', body: data })

export const deleteRentalPostMedia = (postId: string, mediaId: string) =>
  apiRequest<void>(`/api/rental-posts/${postId}/media/${mediaId}`, { method: 'DELETE' })

export const submitRentalPost = (postId: string) =>
  apiRequest<RentalPost>(`/api/rental-posts/${postId}/submit`, { method: 'POST' })

export const archiveRentalPost = (postId: string) =>
  apiRequest<void>(`/api/rental-posts/${postId}/archive`, { method: 'POST' })

export const markRentalPostRented = (postId: string) =>
  apiRequest<void>(`/api/rental-posts/${postId}/mark-rented`, { method: 'POST' })

// Reviews
export const getRentalPostReviews = (rentalPostId: string, options?: { auth?: boolean }) =>
  apiRequest<RentalReviewCollection>(`/api/rental-posts/${rentalPostId}/reviews`, {
    auth: options?.auth,
  })

export const upsertMyRentalReview = (rentalPostId: string, data: UpsertRentalReviewInput) =>
  apiRequest<RentalReview>(`/api/rental-posts/${rentalPostId}/reviews/mine`, {
    method: 'PUT',
    body: data,
  })

export const deleteMyRentalReview = (rentalPostId: string) =>
  apiRequest<void>(`/api/rental-posts/${rentalPostId}/reviews/mine`, { method: 'DELETE' })

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

// Conversations
export const getConversations = () => apiRequest<PostConversation[]>('/api/conversations')

export const startRentalPostConversation = (postId: string) =>
  apiRequest<PostConversation>(`/api/conversations/rental-posts/${postId}`, { method: 'POST' })

export const getConversationMessages = (conversationId: string) =>
  apiRequest<PostMessage[]>(`/api/conversations/${conversationId}/messages`)

export const sendConversationMessage = (conversationId: string, body: string) =>
  apiRequest<PostMessage>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { body },
  })

export const sendConversationImages = (
  conversationId: string,
  files: File[],
  context: MessageAttachmentContext,
  body?: string,
) => {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  form.append('context', String(context))
  if (body?.trim()) form.append('body', body.trim())
  return apiUpload<PostMessage>(`/api/conversations/${conversationId}/messages/images`, form)
}

export const downloadConversationAttachment = (contentPath: string) => apiDownload(contentPath)

export const deleteConversationAttachment = (
  conversationId: string,
  messageId: string,
  attachmentId: string,
) => apiRequest<void>(
  `/api/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`,
  { method: 'DELETE' },
)

// Viewing appointments
export const getViewingAppointments = () =>
  apiRequest<ViewingAppointment[]>('/api/viewing-appointments')

export const createViewingAppointment = (
  rentalPostId: string,
  data: { scheduledAt: string; note?: string },
) =>
  apiRequest<ViewingAppointment>(`/api/rental-posts/${rentalPostId}/viewing-appointments`, {
    method: 'POST',
    body: data,
  })

export const confirmViewingAppointment = (id: string) =>
  apiRequest<ViewingAppointment>(`/api/viewing-appointments/${id}/confirm`, { method: 'POST' })

export const rejectViewingAppointment = (id: string) =>
  apiRequest<ViewingAppointment>(`/api/viewing-appointments/${id}/reject`, { method: 'POST' })

export const cancelViewingAppointment = (id: string) =>
  apiRequest<ViewingAppointment>(`/api/viewing-appointments/${id}/cancel`, { method: 'POST' })

export const rescheduleViewingAppointment = (
  id: string,
  data: { scheduledAt: string },
) =>
  apiRequest<ViewingAppointment>(`/api/viewing-appointments/${id}/reschedule`, {
    method: 'POST',
    body: data,
  })

export const completeViewingAppointment = (id: string) =>
  apiRequest<ViewingAppointment>(`/api/viewing-appointments/${id}/complete`, { method: 'POST' })

// AI
export const parseAiSearch = (text: string) =>
  apiRequest<AiParsedSearchCriteria>('/api/ai/parse-search', {
    method: 'POST',
    body: { text },
  })

export const highlightRentalPosts = (data: { text?: string; maxResults?: number }) =>
  apiRequest<AiHighlightResponse>('/api/ai/highlight-rental-posts', {
    method: 'POST',
    body: { text: data.text, maxResults: data.maxResults ?? 8 },
  })

// Chatbot
export const getChatbotPopupConfig = () =>
  apiRequest<ChatbotPopupConfig>('/api/chatbot/popup-config')

export const getChatbotConversations = () =>
  apiRequest<ChatbotConversation[]>('/api/chatbot/conversations')

export const getChatbotMessages = (conversationId: string) =>
  apiRequest<ChatbotMessage[]>(`/api/chatbot/conversations/${conversationId}/messages`)

export const sendChatbotMessage = (data: { conversationId?: string; message: string }) =>
  apiRequest<ChatbotReply>('/api/chatbot/messages', {
    method: 'POST',
    body: {
      message: data.message,
      ...(data.conversationId ? { conversationId: data.conversationId } : {}),
    },
  })

// Upload
export const uploadImages = (files: File[], folder?: string) => {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  return apiUpload<UploadImageResult[]>('/api/upload/image', form, {
    params: folder ? { folder } : undefined,
  })
}

// Subscriptions
export const getSubscriptionPackages = () =>
  apiRequest<SubscriptionPackage[]>('/api/subscriptions/packages', { auth: false })

export const getMySubscription = () => apiRequest<MySubscription>('/api/subscriptions/me')

export const createPremiumMomoPayment = (packageCode: string) =>
  apiRequest<MomoPaymentResponse>(`/api/subscriptions/premium/${packageCode}/momo/create`, {
    method: 'POST',
  })

export const createPremiumPayOsPayment = (packageCode: string) =>
  apiRequest<PayOsPaymentResponse>(`/api/subscriptions/premium/${packageCode}/payos/create`, {
    method: 'POST',
  })

// Notifications
export const getNotifications = async (unreadOnly = false) => {
  const serverNotifications = await apiRequest<Notification[]>('/api/notifications', {
    params: { unreadOnly },
  })
  return [...serverNotifications, ...getDefaultNotifications(unreadOnly)].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )
}

export const markNotificationRead = (notificationId: string) => {
  if (isDefaultNotificationId(notificationId)) {
    return Promise.resolve(markDefaultNotificationRead(notificationId))
  }
  return apiRequest<Notification>(`/api/notifications/${notificationId}/read`, { method: 'POST' })
}

export const markAllNotificationsRead = async () => {
  markAllDefaultNotificationsRead()
  await apiRequest<void>('/api/notifications/read-all', { method: 'POST' })
}

// Reports
export const createReport = (data: {
  targetType: ReportTargetType
  targetId: string
  reason?: string
  description?: string
}) => apiRequest<Report>('/api/reports', { method: 'POST', body: data })

// Payments
export const getPayments = (params?: { status?: number; take?: number }) =>
  apiRequest<Payment[]>('/api/payments', { params })

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
export const getAdminActiveUsers = (options?: { onlineMinutes?: number; recentMinutes?: number }) =>
  apiRequest<AdminActiveUser[]>('/api/admin/moderation/active-users', {
    params: {
      onlineMinutes: options?.onlineMinutes,
      recentMinutes: options?.recentMinutes,
    },
  })

export const getPendingRentalPosts = () =>
  apiRequest<RentalPostSummary[]>('/api/admin/moderation/rental-posts/pending')

export const approveRentalPost = (postId: string, ownerConsentVerificationNote?: string) =>
  apiRequest<RentalPost>(`/api/admin/moderation/rental-posts/${postId}/approve`, {
    method: 'POST',
    body: { ownerConsentVerificationNote },
  })

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

// Marketplace
export const searchMarketplacePosts = (params?: {
  keyword?: string
  category?: string
  listingType?: MarketplaceListingType
  minPrice?: number
  maxPrice?: number
  latitude?: number
  longitude?: number
  radiusKm?: number
  nearRentalPostId?: string
  page?: number
  pageSize?: number
}) => apiRequest<MarketplacePost[]>('/api/marketplace-posts', { params, auth: false })

export const getMarketplacePost = (id: string) =>
  apiRequest<MarketplacePost>(`/api/marketplace-posts/${id}`, { auth: false })

export const createMarketplacePost = (data: UpsertMarketplacePostInput) =>
  apiRequest<MarketplacePost>('/api/marketplace-posts', { method: 'POST', body: data })

export const updateMarketplacePost = (id: string, data: UpsertMarketplacePostInput) =>
  apiRequest<MarketplacePost>(`/api/marketplace-posts/${id}`, { method: 'PUT', body: data })

export const markMarketplacePostSold = (id: string) =>
  apiRequest<void>(`/api/marketplace-posts/${id}/sold`, { method: 'POST' })

export const archiveMarketplacePost = (id: string) =>
  apiRequest<void>(`/api/marketplace-posts/${id}/archive`, { method: 'POST' })

export const getMyMarketplaceOrders = () =>
  apiRequest<MarketplaceOrder[]>('/api/marketplace-orders')

export const createMarketplaceOrder = (
  postId: string,
  data: { pickupAt: string; pickupAddress?: string; note?: string; quantity?: number },
) =>
  apiRequest<MarketplaceOrder>(`/api/marketplace-posts/${postId}/orders`, {
    method: 'POST',
    body: data,
  })

export const acceptMarketplaceOrder = (id: string) =>
  apiRequest<MarketplaceOrder>(`/api/marketplace-orders/${id}/accept`, { method: 'POST' })

export const rejectMarketplaceOrder = (id: string) =>
  apiRequest<MarketplaceOrder>(`/api/marketplace-orders/${id}/reject`, { method: 'POST' })

export const cancelMarketplaceOrder = (id: string) =>
  apiRequest<MarketplaceOrder>(`/api/marketplace-orders/${id}/cancel`, { method: 'POST' })

export const completeMarketplaceOrder = (id: string) =>
  apiRequest<MarketplaceOrder>(`/api/marketplace-orders/${id}/complete`, { method: 'POST' })

export const markMarketplaceOrderDelivered = (id: string) =>
  apiRequest<MarketplaceOrder>(`/api/marketplace-orders/${id}/delivered`, { method: 'POST' })

export const startMarketplaceConversation = (postId: string) =>
  apiRequest<PostConversation>(`/api/conversations/marketplace-posts/${postId}`, { method: 'POST' })

// Homeji balance and marketplace seller packages
export const getMyWallet = () => apiRequest<Wallet>('/api/wallet')

export const getMyWalletTransactions = (take = 50) =>
  apiRequest<WalletTransaction[]>('/api/wallet/transactions', { params: { take } })

export const getMyWalletWithdrawals = () =>
  apiRequest<WalletWithdrawal[]>('/api/wallet/withdrawals')

export const createWalletWithdrawal = (data: {
  amount: number
  bankName: string
  accountNumber: string
  accountHolder: string
}) => apiRequest<WalletWithdrawal>('/api/wallet/withdrawals', { method: 'POST', body: data })

export const getAdminWalletWithdrawals = (status?: WalletWithdrawalStatus) =>
  apiRequest<WalletWithdrawal[]>('/api/admin/wallet-withdrawals', { params: { status } })

export const completeWalletWithdrawal = (id: string, note?: string) =>
  apiRequest<WalletWithdrawal>(`/api/admin/wallet-withdrawals/${id}/complete`, {
    method: 'POST',
    body: { note },
  })

export const createMarketplaceCartOrder = (data: {
  items: Array<{ postId: string; quantity: number }>
  pickupAt: string
  pickupAddress: string
  note?: string
}) =>
  apiRequest<MarketplaceOrder[]>('/api/marketplace-orders/cart', {
    method: 'POST',
    body: data,
  })

export const rejectWalletWithdrawal = (id: string, note?: string) =>
  apiRequest<WalletWithdrawal>(`/api/admin/wallet-withdrawals/${id}/reject`, {
    method: 'POST',
    body: { note },
  })

// Wanted posts
export const searchWantedPosts = (params?: {
  area?: string
  maxBudget?: number
  page?: number
  pageSize?: number
}) => apiRequest<RentalWantedPost[]>('/api/rental-wanted-posts', { params, auth: false })

export const getWantedPost = (id: string) =>
  apiRequest<RentalWantedPost>(`/api/rental-wanted-posts/${id}`, { auth: false })

export const createWantedPost = (data: UpsertRentalWantedPostInput) =>
  apiRequest<RentalWantedPost>('/api/rental-wanted-posts', { method: 'POST', body: data })

export const updateWantedPost = (id: string, data: UpsertRentalWantedPostInput) =>
  apiRequest<RentalWantedPost>(`/api/rental-wanted-posts/${id}`, { method: 'PUT', body: data })

export const closeWantedPost = (id: string) =>
  apiRequest<void>(`/api/rental-wanted-posts/${id}/close`, { method: 'POST' })

export const startWantedPostConversation = (postId: string) =>
  apiRequest<PostConversation>(`/api/conversations/rental-wanted-posts/${postId}`, {
    method: 'POST',
  })

// Landlord verification
export const getMyLandlordVerification = () =>
  apiRequest<LandlordVerification | null>('/api/landlord-verifications/mine')

export const submitLandlordVerification = (data: { documentUrl?: string; note?: string }) =>
  apiRequest<LandlordVerification>('/api/landlord-verifications', { method: 'POST', body: data })

export const getAdminLandlordVerifications = (status?: number) =>
  apiRequest<LandlordVerification[]>('/api/admin/landlord-verifications', { params: { status } })

export const reviewLandlordVerification = (
  id: string,
  data: { approved: boolean; note?: string },
) =>
  apiRequest<LandlordVerification>(`/api/admin/landlord-verifications/${id}/review`, {
    method: 'POST',
    body: data,
  })

// Activities
export const getMyActivities = (params?: { type?: UserActivityType; take?: number }) =>
  apiRequest<UserActivity[]>('/api/activities', { params })
