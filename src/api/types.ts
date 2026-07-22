export const UserRole = {
  Renter: 1,
  Landlord: 2,
  Admin: 3,
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const RentalPostType = {
  VacantRoom: 1,
  RoommateShare: 2,
  RoomTransfer: 3,
} as const
export type RentalPostType = (typeof RentalPostType)[keyof typeof RentalPostType]

export const RoomTransferKind = {
  LeaseAssignment: 1,
  TemporarySublet: 2,
} as const
export type RoomTransferKind = (typeof RoomTransferKind)[keyof typeof RoomTransferKind]

export const RentalPostStatus = {
  Draft: 1,
  Pending: 2,
  /** @deprecated Use Pending */
  PendingReview: 2,
  Active: 3,
  /** @deprecated Use Active */
  Published: 3,
  Rejected: 4,
  Archived: 5,
  Rented: 6,
} as const
export type RentalPostStatus = (typeof RentalPostStatus)[keyof typeof RentalPostStatus]

export const SleepHabit = {
  Unknown: 0,
  EarlyBird: 1,
  NightOwl: 2,
} as const
export type SleepHabit = (typeof SleepHabit)[keyof typeof SleepHabit]

export const PetPreference = {
  Unknown: 0,
  NoPets: 1,
  HasPets: 2,
  PetFriendly: 3,
} as const
export type PetPreference = (typeof PetPreference)[keyof typeof PetPreference]

export const SmokingPreference = {
  Unknown: 0,
  NonSmoking: 1,
  Smoking: 2,
} as const
export type SmokingPreference = (typeof SmokingPreference)[keyof typeof SmokingPreference]

export const LandlordVerificationStatus = {
  NotSubmitted: 0,
  Pending: 1,
  Verified: 2,
  Rejected: 3,
} as const
export type LandlordVerificationStatus =
  (typeof LandlordVerificationStatus)[keyof typeof LandlordVerificationStatus]

export const RoommateInvitationStatus = {
  Pending: 1,
  Accepted: 2,
  Rejected: 3,
  Cancelled: 4,
} as const
export type RoommateInvitationStatus =
  (typeof RoommateInvitationStatus)[keyof typeof RoommateInvitationStatus]

export const MessageAttachmentContext = {
  Other: 0,
  CurrentRoom: 1,
  Bathroom: 2,
  Kitchen: 3,
  Entrance: 4,
  UtilityMeter: 5,
  ExistingDamage: 6,
} as const
export type MessageAttachmentContext =
  (typeof MessageAttachmentContext)[keyof typeof MessageAttachmentContext]

export const MessageAttachmentStatus = {
  Ready: 1,
  Deleted: 2,
  Rejected: 3,
} as const
export type MessageAttachmentStatus =
  (typeof MessageAttachmentStatus)[keyof typeof MessageAttachmentStatus]

/** Matches backend NotificationType */
export const NotificationType = {
  PostApproved: 1,
  PostRejected: 2,
  RoommateInvitationReceived: 3,
  RoommateInvitationAccepted: 4,
  ReportResolved: 5,
  NewMessage: 6,
  ViewingAppointmentRequested: 7,
  ViewingAppointmentUpdated: 8,
  LandlordVerificationUpdated: 9,
  DirectMessage: 10,
  SavedPostChanged: 11,
  NewMatchingRentalPost: 12,
  MarketplaceOrderUpdated: 13,
  /** Client-provided onboarding notifications; values stay outside the backend enum range. */
  SystemAnnouncement: 1001,
  Promotion: 1002,
  MarketplaceTip: 1003,
  SafetyTip: 1004,
  /** @deprecated aliases */
  RentalPostApproved: 1,
  RentalPostRejected: 2,
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const ReportTargetType = {
  RentalPost: 1,
  User: 2,
  RoommateInvitation: 3,
  MarketplacePost: 4,
  RentalReview: 5,
  RentalWantedPost: 6,
} as const
export type ReportTargetType = (typeof ReportTargetType)[keyof typeof ReportTargetType]

export const ReportStatus = {
  Pending: 1,
  Resolved: 2,
  Rejected: 3,
} as const
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus]

export const PaymentMethod = {
  Momo: 1,
  PayOs: 2,
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export const PaymentStatus = {
  Pending: 1,
  Completed: 2,
  Failed: 3,
  Cancelled: 4,
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const PaymentPurpose = {
  General: 1,
  PremiumSubscription: 2,
  WalletTopUp: 3,
} as const
export type PaymentPurpose = (typeof PaymentPurpose)[keyof typeof PaymentPurpose]

export const MediaType = {
  Image: 1,
  Video: 2,
} as const
export type MediaType = (typeof MediaType)[keyof typeof MediaType]

export const ViewingAppointmentStatus = {
  Pending: 0,
  Confirmed: 1,
  Rejected: 2,
  Cancelled: 3,
  Completed: 4,
} as const
export type ViewingAppointmentStatus =
  (typeof ViewingAppointmentStatus)[keyof typeof ViewingAppointmentStatus]

export const ConversationSubjectType = {
  RentalPost: 1,
  MarketplacePost: 2,
  WantedPost: 3,
} as const
export type ConversationSubjectType =
  (typeof ConversationSubjectType)[keyof typeof ConversationSubjectType]

export const ChatMessageSender = {
  User: 1,
  Assistant: 2,
} as const
export type ChatMessageSender = (typeof ChatMessageSender)[keyof typeof ChatMessageSender]

export const SubscriptionTier = {
  Basic: 1,
  Premium: 2,
} as const
export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier]

export interface AuthSession {
  accessToken: string | null
  tokenType: string | null
  expiresIn: number | null
  refreshToken: string | null
  userId: string | null
  email: string | null
  emailConfirmationRequired: boolean
  message: string
}

export interface AccountMessage {
  message: string
}

/** Kết quả GET /api/account/email-availability */
export interface EmailAvailabilityResult {
  email: string
  /** true nếu email đã có trong hệ thống */
  exists: boolean
  /** true nếu còn dùng được */
  available: boolean
}

/** @deprecated Dùng EmailAvailabilityResult */
export type CheckEmailResult = EmailAvailabilityResult

export interface AuthUrl {
  url: string
}

export interface UserProfile {
  id: string
  displayName: string
  role: UserRole
  phone: string | null
  avatarPath: string | null
  school: string | null
  preferredArea: string | null
  contactAddress?: string | null
  rentalNeed?: string | null
  sleepHabit: SleepHabit
  petPreference: PetPreference
  smokingPreference: SmokingPreference
  maxBudget: number | null
  onboardingCompleted: boolean
  landlordVerificationStatus: LandlordVerificationStatus
  isPremium?: boolean
  subscriptionBadge?: string
  premiumExpiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminActiveUser {
  userId: string
  displayName: string
  role: UserRole
  avatarPath: string | null
  lastSeenAt: string
  isOnline: boolean
}

export interface RentalPostMedia {
  id: string
  mediaType: MediaType
  bucket: string
  path: string
  isThumbnail: boolean
  sortOrder: number
}

export interface RentalPostSummary {
  id: string
  type: RentalPostType
  title: string
  price: number
  area: number
  address: string
  latitude: number
  longitude: number
  thumbnailPath: string | null
  viewCount: number
  saveCount: number
  isOwnerPremium?: boolean
  ownerBadge?: string | null
  boostScore?: number
  highlightTag?: string | null
  transferKind?: RoomTransferKind | null
  originalLeaseEndsOn?: string | null
  passFee?: number
  ownerConsentVerified?: boolean
  /** Returned only by the admin moderation endpoint. */
  ownerConsentContact?: string | null
}

export interface RentalPost extends RentalPostSummary {
  ownerId: string
  status: RentalPostStatus
  description: string
  deposit: number
  amenities: string[]
  media: RentalPostMedia[]
  electricityPrice?: number
  waterPrice?: number
  internetPrice?: number
  maxOccupants?: number
  availableSlots?: number
  houseRules?: string | null
  availableFrom?: string | null
  transferReason?: string | null
  ownerConsentConfirmed?: boolean
  ownerConsentVerifiedAt?: string | null
  moderationReason: string | null
  createdAt: string
  updatedAt: string
  ownerDisplayName?: string | null
  ownerPhone?: string | null
  ownerAvatarPath?: string | null
  isOwnerVerified?: boolean
}

export interface RoommateCandidate {
  userId: string
  displayName: string
  school: string | null
  preferredArea: string | null
  matchScore: number
}

export interface RoommateInvitation {
  id: string
  rentalPostId: string
  rentalPostTitle: string
  senderId: string
  receiverId: string
  status: RoommateInvitationStatus
  conversationId: string | null
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  relatedEntityId: string | null
  isRead: boolean
  createdAt: string
  readAt: string | null
}

export interface Report {
  id: string
  reporterId: string
  reporterDisplayName: string
  targetType: ReportTargetType
  targetId: string
  targetDisplayName: string
  targetImagePath: string | null
  relatedRentalPostId: string | null
  reason: string
  description: string | null
  status: ReportStatus
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  userId: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  purpose?: PaymentPurpose
  packageCode?: string | null
  orderCode: string
  requestId: string | null
  description: string
  paymentUrl: string | null
  deeplink: string | null
  qrCodeUrl: string | null
  qrCode: string | null
  qrDataUrl: string | null
  externalTransactionId: string | null
  providerMessage: string | null
  createdAt: string
  updatedAt: string
  paidAt: string | null
}

export interface MomoPaymentResponse {
  paymentId: string
  orderCode: string
  requestId: string
  amount: number
  status: PaymentStatus
  payUrl: string | null
  deeplink: string | null
  qrCodeUrl: string | null
  providerMessage: string | null
}

export interface PayOsPaymentResponse {
  paymentId: string
  orderCode: string
  amount: number
  status: PaymentStatus
  checkoutUrl: string | null
  qrCode: string | null
  providerMessage: string | null
}

export interface RentalPostSearchParams {
  keyword?: string
  minPrice?: number
  maxPrice?: number
  minArea?: number
  maxArea?: number
  maxDeposit?: number
  minAvailableSlots?: number
  availableFromBefore?: string
  minLatitude?: number
  maxLatitude?: number
  minLongitude?: number
  maxLongitude?: number
  amenities?: string[]
  page?: number
  pageSize?: number
}

export interface PostConversation {
  id: string
  subjectType: ConversationSubjectType
  subjectId: string
  otherParticipantId: string
  otherParticipantName: string
  otherParticipantAvatarPath: string | null
  createdAt: string
  updatedAt: string
  lastMessage: string | null
  lastMessageSenderId: string | null
  unreadCount: number
}

export interface PostMessage {
  id: string
  conversationId: string
  senderId: string
  body: string
  sentAt: string
  attachments?: PostMessageAttachment[]
}

export interface PostMessageAttachment {
  id: string
  uploaderId: string
  context: MessageAttachmentContext
  status: MessageAttachmentStatus
  mimeType: string
  bytes: number
  width: number
  height: number
  contentPath: string
  createdAt: string
  deletedAt: string | null
}

export interface ViewingAppointment {
  id: string
  rentalPostId: string
  rentalPostTitle: string
  requesterId: string
  ownerId: string
  scheduledAt: string
  note: string | null
  status: ViewingAppointmentStatus
  createdAt: string
  updatedAt: string
}

export interface RentalReview {
  id: string
  rentalPostId: string
  reviewerId: string
  reviewerDisplayName: string
  reviewerAvatarPath: string | null
  rating: number
  comment: string | null
  locationRating: number | null
  valueRating: number | null
  amenitiesRating: number | null
  securityRating: number | null
  cleanlinessRating: number | null
  accuracyRating: number | null
  landlordRating: number | null
  createdAt: string
  updatedAt: string
}

export interface RentalReviewRatingSummary {
  location: number | null
  value: number | null
  amenities: number | null
  security: number | null
  cleanliness: number | null
  accuracy: number | null
  landlord: number | null
}

export interface RentalReviewCollection {
  rentalPostId: string
  averageRating: number
  reviewCount: number
  criteriaAverages: RentalReviewRatingSummary
  reviews: RentalReview[]
}

export interface UpsertRentalReviewInput {
  rating: number
  comment?: string
  locationRating?: number
  valueRating?: number
  amenitiesRating?: number
  securityRating?: number
  cleanlinessRating?: number
  accuracyRating?: number
  landlordRating?: number
}

export interface AiParsedSearchCriteria {
  location: string | null
  keyword: string | null
  priceMin: number | null
  priceMax: number | null
  areaMin: number | null
  areaMax: number | null
  criteria: string[]
}

export interface AiHighlightedRentalPost {
  post: RentalPostSummary
  score: number
  reasons: string[]
  tag: string
}

export interface AiHighlightResponse {
  criteria: AiParsedSearchCriteria
  posts: AiHighlightedRentalPost[]
  tag: string
  mapFocusAddress: string | null
  mapFocusLatitude: number | null
  mapFocusLongitude: number | null
}

export interface ChatbotMessage {
  id: string
  conversationId: string
  sender: ChatMessageSender
  content: string
  createdAt: string
}

export interface ChatbotConversation {
  id: string
  title: string
  lastMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatbotPopupConfig {
  enabled: boolean
  title: string
  greeting: string
  suggestedPrompts: string[]
}

export const ChatbotNavigationActionKind = {
  OpenSection: 1,
  Navigate: 2,
} as const
export type ChatbotNavigationActionKind =
  (typeof ChatbotNavigationActionKind)[keyof typeof ChatbotNavigationActionKind]

export interface ChatbotNavigationAction {
  id: string
  label: string
  description: string
  kind: ChatbotNavigationActionKind
  target: string
}

export interface ChatbotReply {
  conversationId: string
  userMessage: ChatbotMessage
  assistantMessage: ChatbotMessage
  searchUpdate: AiHighlightResponse | null
  actions: ChatbotNavigationAction[]
}

export interface UploadImageResult {
  url: string
  publicId: string
  width: number
  height: number
  bytes: number
  format: string
}

export interface SubscriptionPackage {
  code: string
  name: string
  tier: SubscriptionTier
  price: number
  durationDays: number
  badge: string
  benefits: string[]
}

export interface MySubscription {
  tier: SubscriptionTier
  isPremium: boolean
  badge: string
  packageCode: string | null
  packageName: string | null
  premiumStartedAt: string | null
  premiumExpiresAt: string | null
}

export interface RentalPostOwnerStatsItem {
  id: string
  title: string
  type: RentalPostType
  status: RentalPostStatus
  viewCount: number
  saveCount: number
  contactCount: number
  appointmentCount: number
  boostScore: number
  updatedAt: string
}

export interface RentalPostOwnerStats {
  totalPosts: number
  totalViews: number
  totalSaves: number
  totalContacts: number
  totalAppointments: number
  isPremium: boolean
  posts: RentalPostOwnerStatsItem[]
}

export interface CompareRentalPostItem {
  post: RentalPost
  averageRating: number
  reviewCount: number
}

export interface CompareRentalPostsResult {
  posts: CompareRentalPostItem[]
}

export const MarketplacePostStatus = {
  Active: 1,
  Sold: 2,
  Archived: 3,
} as const
export type MarketplacePostStatus = (typeof MarketplacePostStatus)[keyof typeof MarketplacePostStatus]

export const MarketplaceListingType = {
  SecondHand: 1,
  Food: 2,
} as const
export type MarketplaceListingType =
  (typeof MarketplaceListingType)[keyof typeof MarketplaceListingType]

export const WalletTransactionKind = {
  TopUp: 1,
  Purchase: 2,
  Refund: 3,
  SaleProceeds: 4,
  PlatformFee: 5,
  LegacyServicePurchase: 6,
  Withdrawal: 7,
  WithdrawalRefund: 8,
} as const
export type WalletTransactionKind =
  (typeof WalletTransactionKind)[keyof typeof WalletTransactionKind]

export const MarketplaceOrderStatus = {
  Requested: 1,
  Accepted: 2,
  Rejected: 3,
  Cancelled: 4,
  Completed: 5,
  Expired: 6,
  Delivered: 7,
} as const
export type MarketplaceOrderStatus =
  (typeof MarketplaceOrderStatus)[keyof typeof MarketplaceOrderStatus]

export const WantedPostStatus = {
  Active: 1,
  Closed: 2,
} as const
export type WantedPostStatus = (typeof WantedPostStatus)[keyof typeof WantedPostStatus]

export const UserActivityType = {
  General: 0,
  ViewedRentalPost: 1,
  RentalSearch: 2,
  SentMessage: 3,
  RoommateInvitation: 4,
  Payment: 5,
  Review: 6,
  Report: 7,
} as const
export type UserActivityType = (typeof UserActivityType)[keyof typeof UserActivityType]

export interface MarketplacePost {
  id: string
  sellerId: string
  sellerDisplayName: string
  sellerPhone: string | null
  status: MarketplacePostStatus
  title: string
  description: string
  price: number
  condition: string
  category: string
  address: string
  latitude: number
  longitude: number
  linkedRentalPostId: string | null
  mediaUrls: string[]
  distanceKm: number | null
  createdAt: string
  updatedAt: string
  listingType: MarketplaceListingType
  availableQuantity: number
  reservedQuantity: number
  unit: string
  preparationMinutes: number | null
}

export interface UpsertMarketplacePostInput {
  title?: string
  description?: string
  price: number
  condition?: string
  category?: string
  address?: string
  latitude: number
  longitude: number
  linkedRentalPostId?: string | null
  mediaUrls: string[]
  listingType?: MarketplaceListingType
  availableQuantity?: number
  unit?: string
  preparationMinutes?: number | null
}

export interface MarketplaceOrder {
  id: string
  marketplacePostId: string
  buyerId: string
  sellerId: string
  agreedPrice: number
  pickupAt: string
  pickupAddress: string
  note: string | null
  status: MarketplaceOrderStatus
  createdAt: string
  updatedAt: string
  unitPrice: number
  quantity: number
  platformFeeRate: number
  platformFeeAmount: number
  sellerNetAmount: number
  deliveredAt: string | null
  fundsReleaseDueAt: string | null
  fundsReleasedAt: string | null
  refundedAt: string | null
  postTitle: string | null
  postImageUrl: string | null
  buyerDisplayName: string | null
  sellerDisplayName: string | null
  sellerAddress: string | null
}

export interface Wallet {
  userId: string
  balance: number
  totalDeposited: number
  totalSpent: number
  totalEarned: number
  isActivated: boolean
  minimumTopUp: number
  maximumTopUp: number
  minimumWithdrawalReserve: number
  updatedAt: string | null
}

export const WalletWithdrawalStatus = {
  Pending: 1,
  Completed: 2,
  Rejected: 3,
} as const
export type WalletWithdrawalStatus =
  (typeof WalletWithdrawalStatus)[keyof typeof WalletWithdrawalStatus]

export interface WalletWithdrawal {
  id: string
  userId: string
  amount: number
  bankName: string
  accountNumber: string
  accountHolder: string
  status: WalletWithdrawalStatus
  adminNote: string | null
  processedBy: string | null
  createdAt: string
  processedAt: string | null
}

export interface WalletTransaction {
  id: string
  kind: WalletTransactionKind
  amount: number
  balanceAfter: number
  referenceId: string
  description: string
  createdAt: string
}

export interface RentalWantedPost {
  id: string
  requesterId: string
  requesterDisplayName: string
  requesterAvatarPath: string | null
  status: WantedPostStatus
  title: string
  description: string
  preferredArea: string
  maxBudget: number
  occupantCount: number
  amenityCodes: string[]
  desiredMoveInDate: string
  createdAt: string
  updatedAt: string
}

export interface UpsertRentalWantedPostInput {
  title: string
  description: string
  preferredArea: string
  maxBudget: number
  occupantCount: number
  amenityCodes: string[]
  desiredMoveInDate: string
}

export interface LandlordVerification {
  id: string
  applicantId: string
  applicantDisplayName: string
  documentUrl: string
  applicantNote: string | null
  status: LandlordVerificationStatus
  reviewNote: string | null
  reviewedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface UserActivity {
  id: string
  action: string
  resourcePath: string
  httpMethod: string
  responseStatusCode: number
  type: UserActivityType
  relatedEntityId: string | null
  details: string | null
  occurredAt: string
}

export interface ApiError {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
}
