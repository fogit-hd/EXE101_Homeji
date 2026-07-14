import {
  LandlordVerificationStatus,
  MarketplaceOrderStatus,
  MarketplacePostStatus,
  MediaType,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PetPreference,
  RentalPostStatus,
  RentalPostType,
  ReportStatus,
  ReportTargetType,
  RoommateInvitationStatus,
  SleepHabit,
  SmokingPreference,
  SubscriptionTier,
  UserActivityType,
  UserRole,
  WantedPostStatus,
} from '../api/types'

export const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export const rentalPostTypeLabel: Record<RentalPostType, string> = {
  [RentalPostType.VacantRoom]: 'Phòng trống',
  [RentalPostType.RoommateShare]: 'Tìm bạn ở ghép',
}

export const rentalPostStatusLabel: Record<number, string> = {
  [RentalPostStatus.Draft]: 'Nháp',
  [RentalPostStatus.Pending]: 'Chờ duyệt',
  [RentalPostStatus.Active]: 'Đã đăng',
  [RentalPostStatus.Rejected]: 'Bị từ chối',
  [RentalPostStatus.Archived]: 'Đã lưu trữ',
  [RentalPostStatus.Rented]: 'Đã cho thuê',
}

export const userRoleLabel: Record<UserRole, string> = {
  [UserRole.Renter]: 'Người thuê',
  [UserRole.Landlord]: 'Chủ nhà',
  [UserRole.Admin]: 'Quản trị viên',
}

export const subscriptionTierLabel: Record<SubscriptionTier, string> = {
  [SubscriptionTier.Basic]: 'Standard',
  [SubscriptionTier.Premium]: 'Premium',
}

export const sleepHabitLabel: Record<SleepHabit, string> = {
  [SleepHabit.Unknown]: 'Chưa cập nhật',
  [SleepHabit.EarlyBird]: 'Ngủ sớm',
  [SleepHabit.NightOwl]: 'Cú đêm',
}

export const petPreferenceLabel: Record<PetPreference, string> = {
  [PetPreference.Unknown]: 'Chưa cập nhật',
  [PetPreference.NoPets]: 'Không nuôi thú cưng',
  [PetPreference.HasPets]: 'Có thú cưng',
  [PetPreference.PetFriendly]: 'Thích nuôi thú cưng',
}

export const smokingPreferenceLabel: Record<SmokingPreference, string> = {
  [SmokingPreference.Unknown]: 'Chưa cập nhật',
  [SmokingPreference.NonSmoking]: 'Không hút thuốc',
  [SmokingPreference.Smoking]: 'Hút thuốc',
}

export const invitationStatusLabel: Record<RoommateInvitationStatus, string> = {
  [RoommateInvitationStatus.Pending]: 'Đang chờ',
  [RoommateInvitationStatus.Accepted]: 'Đã chấp nhận',
  [RoommateInvitationStatus.Rejected]: 'Đã từ chối',
  [RoommateInvitationStatus.Cancelled]: 'Đã hủy',
}

export const notificationTypeLabel: Record<number, string> = {
  [NotificationType.PostApproved]: 'Tin đăng được duyệt',
  [NotificationType.PostRejected]: 'Tin đăng bị từ chối',
  [NotificationType.RoommateInvitationReceived]: 'Lời mời ở ghép',
  [NotificationType.RoommateInvitationAccepted]: 'Lời mời được chấp nhận',
  [NotificationType.ReportResolved]: 'Báo cáo đã xử lý',
  [NotificationType.NewMessage]: 'Tin nhắn mới',
  [NotificationType.ViewingAppointmentRequested]: 'Yêu cầu xem phòng',
  [NotificationType.ViewingAppointmentUpdated]: 'Lịch xem phòng cập nhật',
  [NotificationType.LandlordVerificationUpdated]: 'Xác minh chủ nhà',
  [NotificationType.DirectMessage]: 'Tin nhắn trực tiếp',
  [NotificationType.SavedPostChanged]: 'Tin đã lưu thay đổi',
  [NotificationType.NewMatchingRentalPost]: 'Tin phù hợp mới',
  [NotificationType.MarketplaceOrderUpdated]: 'Đơn chợ đồ cập nhật',
}

export const viewingAppointmentStatusLabel: Record<number, string> = {
  0: 'Chờ xác nhận',
  1: 'Đã xác nhận',
  2: 'Từ chối',
  3: 'Đã hủy',
  4: 'Hoàn tất',
}

export const reportStatusLabel: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: 'Chờ xử lý',
  [ReportStatus.Resolved]: 'Đã xử lý',
  [ReportStatus.Rejected]: 'Đã từ chối',
}

export const reportTargetLabel: Record<number, string> = {
  [ReportTargetType.RentalPost]: 'Tin đăng',
  [ReportTargetType.User]: 'Người dùng',
  [ReportTargetType.RoommateInvitation]: 'Lời mời ở ghép',
  [ReportTargetType.MarketplacePost]: 'Tin chợ đồ',
  [ReportTargetType.RentalReview]: 'Đánh giá',
  [ReportTargetType.RentalWantedPost]: 'Tin tìm phòng',
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  [PaymentMethod.Momo]: 'MoMo',
  [PaymentMethod.PayOs]: 'PayOS',
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: 'Đang chờ',
  [PaymentStatus.Completed]: 'Hoàn tất',
  [PaymentStatus.Failed]: 'Thất bại',
  [PaymentStatus.Cancelled]: 'Đã hủy',
}

export const mediaTypeLabel: Record<MediaType, string> = {
  [MediaType.Image]: 'Ảnh',
  [MediaType.Video]: 'Video',
}

export const landlordVerificationLabel: Record<LandlordVerificationStatus, string> = {
  [LandlordVerificationStatus.NotSubmitted]: 'Chưa gửi',
  [LandlordVerificationStatus.Pending]: 'Đang xét duyệt',
  [LandlordVerificationStatus.Verified]: 'Đã xác minh',
  [LandlordVerificationStatus.Rejected]: 'Bị từ chối',
}

export const marketplacePostStatusLabel: Record<number, string> = {
  [MarketplacePostStatus.Active]: 'Đang bán',
  [MarketplacePostStatus.Sold]: 'Đã bán',
  [MarketplacePostStatus.Archived]: 'Đã ẩn',
}

export const marketplaceOrderStatusLabel: Record<number, string> = {
  [MarketplaceOrderStatus.Requested]: 'Chờ xác nhận',
  [MarketplaceOrderStatus.Accepted]: 'Đã nhận',
  [MarketplaceOrderStatus.Rejected]: 'Từ chối',
  [MarketplaceOrderStatus.Cancelled]: 'Đã hủy',
  [MarketplaceOrderStatus.Completed]: 'Hoàn tất',
}

export const wantedPostStatusLabel: Record<number, string> = {
  [WantedPostStatus.Active]: 'Đang tìm',
  [WantedPostStatus.Closed]: 'Đã đóng',
}

export const userActivityTypeLabel: Record<number, string> = {
  [UserActivityType.General]: 'Chung',
  [UserActivityType.ViewedRentalPost]: 'Xem tin',
  [UserActivityType.RentalSearch]: 'Tìm kiếm',
  [UserActivityType.SentMessage]: 'Tin nhắn',
  [UserActivityType.RoommateInvitation]: 'Ở ghép',
  [UserActivityType.Payment]: 'Thanh toán',
  [UserActivityType.Review]: 'Đánh giá',
  [UserActivityType.Report]: 'Báo cáo',
}

/**
 * Amenity codes (BE stores UPPER_SNAKE_CASE) → nhãn tiếng Việt.
 * Keys must stay uppercase; values are display-only.
 */
export const AMENITY_LABELS: Record<string, string> = {
  WIFI: 'Wifi',
  INTERNET: 'Internet',
  AIR_CONDITIONER: 'Máy lạnh',
  AC: 'Máy lạnh',
  BED: 'Giường',
  FRIDGE: 'Tủ lạnh',
  REFRIGERATOR: 'Tủ lạnh',
  WASHING_MACHINE: 'Máy giặt',
  WASHER: 'Máy giặt',
  KITCHEN: 'Bếp',
  BALCONY: 'Ban công',
  PARKING: 'Gửi xe',
  ELEVATOR: 'Thang máy',
  LIFT: 'Thang máy',
  SECURITY: 'Bảo vệ',
  CEILING_FAN: 'Quạt trần',
  FAN: 'Quạt',
  LOFT: 'Gác lửng',
  MEZZANINE: 'Gác lửng',
  PRIVATE_BATHROOM: 'WC riêng',
  PRIVATE_TOILET: 'WC riêng',
  SHARED_BATHROOM: 'WC chung',
  WINDOW: 'Cửa sổ',
  WATER_HEATER: 'Máy nước nóng',
  HOT_WATER: 'Nước nóng',
  DESK: 'Bàn học',
  WARDROBE: 'Tủ quần áo',
  TV: 'TV',
  MICROWAVE: 'Lò vi sóng',
  PET_FRIENDLY: 'Thú cưng',
  FURNITURE: 'Nội thất',
  FURNISHED: 'Full nội thất',
  FREE_TIME: 'Giờ giấc tự do',
  QUIET: 'Yên tĩnh',
  CAMERA: 'Camera an ninh',
  GUARD: 'Bảo vệ',
  GARDEN: 'Sân vườn',
  POOL: 'Hồ bơi',
  GYM: 'Phòng gym',
  LAUNDRY: 'Chỗ phơi đồ',
  DRYING_AREA: 'Chỗ phơi đồ',
  INCLUDED_ELECTRICITY: 'Điện miễn phí',
  INCLUDED_WATER: 'Nước miễn phí',
  NEAR_MARKET: 'Gần chợ',
  NEAR_SCHOOL: 'Gần trường',
}

/** Alias / legacy labels (VI or mixed) → canonical amenity code. */
const AMENITY_ALIASES: Record<string, string> = {
  WIFI: 'WIFI',
  INTERNET: 'WIFI',
  'MÁY LẠNH': 'AIR_CONDITIONER',
  'MAY LANH': 'AIR_CONDITIONER',
  'ĐIỀU HÒA': 'AIR_CONDITIONER',
  'DIEU HOA': 'AIR_CONDITIONER',
  GIƯỜNG: 'BED',
  GIUONG: 'BED',
  'TỦ LẠNH': 'FRIDGE',
  'TU LANH': 'FRIDGE',
  'MÁY GIẶT': 'WASHING_MACHINE',
  'MAY GIAT': 'WASHING_MACHINE',
  BẾP: 'KITCHEN',
  BEP: 'KITCHEN',
  'BAN CÔNG': 'BALCONY',
  'BAN CONG': 'BALCONY',
  'GỬI XE': 'PARKING',
  'GUI XE': 'PARKING',
  'GIỮ XE': 'PARKING',
  'GIU XE': 'PARKING',
  'THANG MÁY': 'ELEVATOR',
  'THANG MAY': 'ELEVATOR',
  'BẢO VỆ': 'SECURITY',
  'BAO VE': 'SECURITY',
  'QUẠT TRẦN': 'CEILING_FAN',
  'QUAT TRAN': 'CEILING_FAN',
  'GÁC LỬNG': 'LOFT',
  'GAC LUNG': 'LOFT',
  'WC RIÊNG': 'PRIVATE_BATHROOM',
  'WC RIENG': 'PRIVATE_BATHROOM',
  'CỬA SỔ': 'WINDOW',
  'CUA SO': 'WINDOW',
  'THÚ CƯNG': 'PET_FRIENDLY',
  'THU CUNG': 'PET_FRIENDLY',
}

/** Codes used in filters / create-edit chips (stored as-is on BE). */
export const AMENITY_OPTIONS = [
  'WIFI',
  'AIR_CONDITIONER',
  'BED',
  'FRIDGE',
  'WASHING_MACHINE',
  'KITCHEN',
  'BALCONY',
  'PARKING',
  'ELEVATOR',
  'SECURITY',
  'CEILING_FAN',
  'LOFT',
  'PRIVATE_BATHROOM',
  'WINDOW',
  'WATER_HEATER',
  'PET_FRIENDLY',
] as const

export function normalizeAmenityCode(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const upper = trimmed.toUpperCase()
  return AMENITY_ALIASES[upper] ?? AMENITY_ALIASES[trimmed] ?? upper
}

/** Hiển thị tiện ích bằng tiếng Việt ở mọi UI. */
export function amenityLabel(raw: string): string {
  const code = normalizeAmenityCode(raw)
  if (AMENITY_LABELS[code]) return AMENITY_LABELS[code]
  // Already a friendly Vietnamese string (legacy posts)
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(raw)) {
    return raw.trim()
  }
  return code
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

/** Marketplace condition — free string on BE; values align with domain tests (vi). */
export const MARKETPLACE_CONDITIONS = [
  'Mới',
  'Như mới',
  'Đã sử dụng',
  'Cần sửa chữa',
] as const

/** Marketplace category — free string on BE; search filters by exact match. */
export const MARKETPLACE_CATEGORIES = [
  'Nội thất',
  'Điện tử',
  'Đồ bếp',
  'Đồ học tập',
  'Xe / di chuyển',
  'Đồ gia dụng',
  'Khác',
] as const
