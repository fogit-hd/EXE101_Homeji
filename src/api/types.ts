export const UserRole = {
  Renter: 1,
  Landlord: 2,
  Admin: 3,
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const RentalPostType = {
  VacantRoom: 1,
  RoommateShare: 2,
} as const
export type RentalPostType = (typeof RentalPostType)[keyof typeof RentalPostType]

export const RentalPostStatus = {
  Draft: 1,
  PendingReview: 2,
  Published: 3,
  Rejected: 4,
  Archived: 5,
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

export const NotificationType = {
  RentalPostApproved: 1,
  RentalPostRejected: 2,
  RoommateInvitationReceived: 3,
  RoommateInvitationAccepted: 4,
  RoommateInvitationRejected: 5,
  PaymentCompleted: 6,
  ReportResolved: 7,
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const ReportTargetType = {
  RentalPost: 1,
  User: 2,
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

export const MediaType = {
  Image: 1,
  Video: 2,
} as const
export type MediaType = (typeof MediaType)[keyof typeof MediaType]

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
  sleepHabit: SleepHabit
  petPreference: PetPreference
  smokingPreference: SmokingPreference
  maxBudget: number | null
  onboardingCompleted: boolean
  landlordVerificationStatus: LandlordVerificationStatus
  createdAt: string
  updatedAt: string
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
}

export interface RentalPost extends RentalPostSummary {
  ownerId: string
  status: RentalPostStatus
  description: string
  deposit: number
  amenities: string[]
  media: RentalPostMedia[]
  moderationReason: string | null
  createdAt: string
  updatedAt: string
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
  senderId: string
  receiverId: string
  status: RoommateInvitationStatus
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
  targetType: ReportTargetType
  targetId: string
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
  minLatitude?: number
  maxLatitude?: number
  minLongitude?: number
  maxLongitude?: number
  amenities?: string[]
  page?: number
  pageSize?: number
}

export interface ApiError {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
}
