import {
  LandlordVerificationStatus,
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
  UserRole,
} from '../api/types'

export const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export const rentalPostTypeLabel: Record<RentalPostType, string> = {
  [RentalPostType.VacantRoom]: 'Phòng trống',
  [RentalPostType.RoommateShare]: 'Tìm bạn ở ghép',
}

export const rentalPostStatusLabel: Record<RentalPostStatus, string> = {
  [RentalPostStatus.Draft]: 'Nháp',
  [RentalPostStatus.PendingReview]: 'Chờ duyệt',
  [RentalPostStatus.Published]: 'Đã đăng',
  [RentalPostStatus.Rejected]: 'Bị từ chối',
  [RentalPostStatus.Archived]: 'Đã lưu trữ',
}

export const userRoleLabel: Record<UserRole, string> = {
  [UserRole.Renter]: 'Người thuê',
  [UserRole.Landlord]: 'Chủ nhà',
  [UserRole.Admin]: 'Quản trị viên',
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

export const notificationTypeLabel: Record<NotificationType, string> = {
  [NotificationType.RentalPostApproved]: 'Tin đăng được duyệt',
  [NotificationType.RentalPostRejected]: 'Tin đăng bị từ chối',
  [NotificationType.RoommateInvitationReceived]: 'Lời mời ở ghép',
  [NotificationType.RoommateInvitationAccepted]: 'Lời mời được chấp nhận',
  [NotificationType.RoommateInvitationRejected]: 'Lời mời bị từ chối',
  [NotificationType.PaymentCompleted]: 'Thanh toán hoàn tất',
  [NotificationType.ReportResolved]: 'Báo cáo đã xử lý',
}

export const reportStatusLabel: Record<ReportStatus, string> = {
  [ReportStatus.Pending]: 'Chờ xử lý',
  [ReportStatus.Resolved]: 'Đã xử lý',
  [ReportStatus.Rejected]: 'Đã từ chối',
}

export const reportTargetLabel: Record<ReportTargetType, string> = {
  [ReportTargetType.RentalPost]: 'Tin đăng',
  [ReportTargetType.User]: 'Người dùng',
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

export const AMENITY_OPTIONS = [
  'Wifi',
  'Máy lạnh',
  'Giường',
  'Tủ lạnh',
  'Máy giặt',
  'Bếp',
  'Ban công',
  'Gửi xe',
  'Thang máy',
  'Bảo vệ',
]
