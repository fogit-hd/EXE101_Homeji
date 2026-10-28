import { Link } from 'react-router-dom'
import type { UserProfile } from '../../api/types'
import { LandlordVerificationStatus, UserRole } from '../../api/types'
import { formatPrice, landlordVerificationLabel, sleepHabitLabel, petPreferenceLabel, smokingPreferenceLabel } from '../../lib/labels'
import './ProfileOverview.css'

type Props = {
  profile: UserProfile
  verificationStatus: LandlordVerificationStatus
  onEdit: (section: 'basic' | 'lifestyle' | 'verify') => void
}
function SectionIcon({ kind }: { kind: 'person' | 'home' | 'check' | 'gift' | 'star' }) {
  const paths = {
    person: 'M19 21v-2a7 7 0 0 0-14 0v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z',
    check: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
    gift: 'M3 8h18v4H3V8Zm2 4v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z',
    star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}
export function ProfileOverview({ profile, verificationStatus, onEdit }: Props) {
  return <div className="profile-overview">
    <div className="profile-ready"><span className="profile-ready__icon"><SectionIcon kind="check" /></span><p><strong>Thông tin cơ bản đã lưu</strong><span>Bạn có thể nạp tiền và thanh toán. Lối sống là phần tùy chọn.</span></p></div>
    <div className="profile-details">
      <section className="profile-information profile-information--personal" aria-labelledby="profile-personal-heading">
        <header className="profile-information__heading"><div className="profile-information__title"><span className="profile-section-icon"><SectionIcon kind="person" /></span><h2 id="profile-personal-heading">Thông tin cá nhân</h2></div><button type="button" className="profile-edit-button" onClick={() => onEdit('basic')}>Chỉnh sửa <span aria-hidden="true">↗</span></button></header>
        <dl className="profile-facts">
          <div><dt>Họ tên</dt><dd>{profile.displayName}</dd></div>
          <div><dt>Số điện thoại</dt><dd className={!profile.phone ? 'profile-facts__missing' : undefined}>{profile.phone || 'Chưa thêm'}</dd></div>
          <div className="profile-facts__wide"><dt>Trường học</dt><dd className={!profile.school ? 'profile-facts__missing' : undefined}>{profile.school || 'Chưa thêm'}</dd></div>
          <div className="profile-facts__wide"><dt>Địa chỉ liên hệ</dt><dd className={!profile.contactAddress ? 'profile-facts__missing' : undefined}>{profile.contactAddress || 'Chưa thêm'}</dd></div>
          {profile.rentalNeed && <div className="profile-facts__wide"><dt>Nhu cầu thuê</dt><dd>{profile.rentalNeed}</dd></div>}
        </dl>
      </section>
      <section className="profile-information profile-information--roommate" aria-labelledby="profile-roommate-heading">
        <header className="profile-information__heading"><div className="profile-information__title"><span className="profile-section-icon"><SectionIcon kind="home" /></span><h2 id="profile-roommate-heading">Nhu cầu ở ghép</h2></div><span className="profile-optional">Tùy chọn</span></header>
        {profile.onboardingCompleted ? <><dl className="profile-facts profile-facts--roommate">
          <div><dt>Ngân sách tối đa</dt><dd>{profile.maxBudget ? `${formatPrice(profile.maxBudget)}/tháng` : 'Chưa thêm'}</dd></div>
          <div><dt>Khu vực mong muốn</dt><dd>{profile.preferredArea || 'Chưa thêm'}</dd></div>
          <div><dt>Giờ giấc sinh hoạt</dt><dd>{sleepHabitLabel[profile.sleepHabit] || 'Chưa chọn'}</dd></div>
          <div><dt>Thói quen khác</dt><dd>{[petPreferenceLabel[profile.petPreference], smokingPreferenceLabel[profile.smokingPreference]].filter(Boolean).join(' · ') || 'Chưa chọn'}</dd></div>
        </dl><button type="button" className="profile-edit-button profile-roommate-action" onClick={() => onEdit('lifestyle')}>Chỉnh sửa nhu cầu <span aria-hidden="true">→</span></button></> : <div className="profile-roommate-prompt"><div className="profile-roommate-prompt__art" aria-hidden="true"><SectionIcon kind="home" /><span /><span /></div><h3>Tìm người cùng nhịp sống</h3><p>Chia sẻ ngân sách, khu vực và thói quen để người ở ghép hiểu bạn hơn.</p><button type="button" className="profile-edit-button profile-roommate-action" onClick={() => onEdit('lifestyle')}>Thêm nhu cầu <span aria-hidden="true">→</span></button><small>Bạn có thể bổ sung sau.</small></div>}
      </section>
      {profile.role === UserRole.Landlord && <section className="profile-information profile-information--verification" aria-labelledby="profile-verification-heading"><div className="profile-information__title"><span className="profile-section-icon"><SectionIcon kind="check" /></span><div><h2 id="profile-verification-heading">Xác minh chủ nhà</h2><p>{landlordVerificationLabel[verificationStatus]}</p></div></div><button type="button" className="profile-edit-button" onClick={() => onEdit('verify')}>Xem yêu cầu <span aria-hidden="true">→</span></button></section>}
    </div>
    <section className="profile-account-links" aria-label="Tiện ích tài khoản">
      <Link to="/referrals"><span className="profile-link-icon"><SectionIcon kind="gift" /></span><span><strong>Mời bạn & voucher</strong><small>Link mời, quà đã nhận và ưu đãi của bạn</small></span><span className="profile-link-arrow" aria-hidden="true">↗</span></Link>
      <Link to="/?section=payments"><span className="profile-link-icon"><SectionIcon kind="star" /></span><span><strong>{profile.isPremium ? 'Gói Premium của bạn' : 'Khám phá Premium'}</strong><small>{profile.isPremium ? 'Xem quyền lợi và thời hạn gói' : 'Chọn gói phù hợp với nhu cầu'}</small></span><span className="profile-link-arrow" aria-hidden="true">↗</span></Link>
    </section>
  </div>
}
