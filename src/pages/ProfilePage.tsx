import { ProfileOverview } from '../components/profile/ProfileOverview'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { profileReturnTo, profileSetupUrl } from '../lib/profileSetup'
import {
  getMyLandlordVerification,
  submitLandlordVerification,
  updateMyLifestyle,
  updateMyProfile,
  uploadImages,
  type LandlordVerification,
} from '../api'
import {
  LandlordVerificationStatus,
  PetPreference,
  SleepHabit,
  SmokingPreference,
  UserRole,
} from '../api/types'
import { MapToast } from '../components/map/MapToast'
import { ProfileSkeleton } from '../components/skeletons/PageSkeletons'
import { ChoicePicker } from '../components/ui/ChoicePicker'
import { useAuth } from '../contexts/AuthContext'
import { useChangedInputs } from '../hooks/useChangedInputs'
import { getErrorMessage } from '../lib/errors'
import {
  formatDate,
  formatPrice,
  landlordVerificationLabel,
  petPreferenceLabel,
  sleepHabitLabel,
  smokingPreferenceLabel,
  userRoleLabel,
} from '../lib/labels'
import {
  resolveSchoolSelectValue,
  THU_DUC_SCHOOLS,
} from '../lib/thuDucSchools'
import {
  normalizeFullName,
  sanitizePhoneInput,
  USER_INPUT_LIMITS,
  validateFullName,
  validateVietnamPhone,
} from '../lib/userInputValidation'
import './MarketplacePage.css'
import './ProfilePage.css'
import '../components/auth/ProfileSetupNotice.css'

type ProfileTab = 'basic' | 'lifestyle' | 'verify'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

export function ProfilePage({ embedded = false, lifestyleOnly = false }: { embedded?: boolean; lifestyleOnly?: boolean }) {
  const { profile, refreshProfile, needsProfileSetup, profileError } = useAuth()
  const [searchParams] = useSearchParams()
  const returnTo = profileReturnTo(searchParams.get('returnTo'))
  const [editing, setEditing] = useState(() => lifestyleOnly || searchParams.has('profileTab'))
  const [tab, setTab] = useState<ProfileTab>(() => lifestyleOnly || searchParams.get('profileTab') === 'lifestyle' ? 'lifestyle' : 'basic')
  if (useChangedInputs([searchParams.get('profileTab')])) {
    setTab(lifestyleOnly || searchParams.get('profileTab') === 'lifestyle' ? 'lifestyle' : 'basic')
    if (searchParams.has('profileTab')) setEditing(true)
  }
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileErrors, setProfileErrors] = useState<{ displayName?: string; phone?: string }>({})
  const [school, setSchool] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [rentalNeed, setRentalNeed] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>(UserRole.Renter)
  const [sleepHabit, setSleepHabit] = useState<SleepHabit>(SleepHabit.Unknown)
  const [petPreference, setPetPreference] = useState<PetPreference>(PetPreference.Unknown)
  const [smokingPreference, setSmokingPreference] = useState<SmokingPreference>(SmokingPreference.Unknown)
  const [maxBudget, setMaxBudget] = useState('')
  const [preferredArea, setPreferredArea] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savingLifestyle, setSavingLifestyle] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [verification, setVerification] = useState<LandlordVerification | null>(null)
  const [verifyNote, setVerifyNote] = useState('')
  const [verifyFile, setVerifyFile] = useState<File | null>(null)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const profileLoading = !profile && !needsProfileSetup

  const showVerifyTab = role === UserRole.Landlord || profile?.role === UserRole.Landlord
  const verifyStatus =
    verification?.status ?? profile?.landlordVerificationStatus ?? LandlordVerificationStatus.NotSubmitted

  if (useChangedInputs([profile], true) && profile) {
    setDisplayName(profile.displayName)
    setPhone(profile.phone ?? '')
    setSchool(resolveSchoolSelectValue(profile.school ?? ''))
    setContactAddress(profile.contactAddress ?? '')
    setRentalNeed(profile.rentalNeed ?? '')
    setAvatarPath(profile.avatarPath)
    setRole(profile.role)
    setSleepHabit(profile.sleepHabit)
    setPetPreference(profile.petPreference)
    setSmokingPreference(profile.smokingPreference)
    setMaxBudget(profile.maxBudget != null ? String(profile.maxBudget) : '')
    setPreferredArea(profile.preferredArea ?? '')
  }

  if (useChangedInputs([showVerifyTab, tab])) {
    if (!showVerifyTab && tab === 'verify') setTab('basic')
  }

  useEffect(() => {
    let cancelled = false
    void getMyLandlordVerification()
      .then((v) => {
        if (!cancelled) setVerification(v ?? null)
      })
      .catch(() => {
        if (!cancelled) setVerification(null)
      })
    return () => {
      cancelled = true
    }
  }, [profile?.landlordVerificationStatus, showVerifyTab])

  const initials = useMemo(() => initialsFromName(displayName || profile?.displayName || ''), [displayName, profile?.displayName])

  const showToast = (message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, tone })
  }

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  const handleAvatarPick = async (file: File | null) => {
    if (!file) return
    if (!AVATAR_CONTENT_TYPES.has(file.type)) {
      showToast('Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WebP.', 'error')
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      showToast('Ảnh đại diện không được lớn hơn 5 MB.', 'error')
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      return
    }

    const previousAvatarPath = avatarPath
    const previewUrl = URL.createObjectURL(file)
    setAvatarPath(previewUrl)
    setAvatarBusy(true)
    try {
      const uploaded = await uploadImages([file], 'avatars')
      const url = uploaded[0]?.url
      if (!url) throw new Error('Upload thất bại')
      setAvatarPath(url)
      await updateMyProfile({
        displayName: profile?.displayName || 'Người dùng Homeji',
        phone: profile?.phone || undefined,
        school: profile?.school || undefined,
        preferredArea: 'Thủ Đức',
        contactAddress: profile?.contactAddress || undefined,
        rentalNeed: profile?.rentalNeed || undefined,
        avatarPath: url,
      })
      await refreshProfile()
      showToast('Đã cập nhật ảnh đại diện.', 'success')
    } catch (err) {
      setAvatarPath(previousAvatarPath)
      showToast(getErrorMessage(err, 'Tải ảnh thất bại'), 'error')
    } finally {
      URL.revokeObjectURL(previewUrl)
      setAvatarBusy(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextName = normalizeFullName(displayName)
    const nextPhone = sanitizePhoneInput(phone)
    const errors = {
      displayName: validateFullName(nextName) ?? undefined,
      phone: validateVietnamPhone(nextPhone) ?? undefined,
    }
    setProfileErrors(errors)
    if (errors.displayName || errors.phone) {
      showToast(errors.displayName || errors.phone || 'Thông tin chưa hợp lệ.', 'error')
      return
    }
    setSavingProfile(true)
    setSaveError('')
    try {
      await updateMyProfile({
        displayName: nextName,
        phone: nextPhone || undefined,
        school: school.trim() || undefined,
        preferredArea: 'Thủ Đức',
        contactAddress: contactAddress || undefined,
        rentalNeed: rentalNeed || undefined,
        avatarPath: avatarPath || undefined,
      })
      await refreshProfile()
      showToast('Đã lưu thông tin hồ sơ.', 'success')
      if (!returnTo) setEditing(false)
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Chưa lưu được thông tin. Hãy thử lại.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLifestyleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (needsProfileSetup) { setTab('basic'); showToast('Hãy lưu Thông tin cơ bản trước khi thêm lối sống.', 'info'); return }
    if (savingLifestyle) return
    const budget = maxBudget.trim() ? Number(maxBudget) : undefined
    if (budget !== undefined && (!Number.isFinite(budget) || budget <= 0)) {
      showToast('Ngân sách tối đa phải là số lớn hơn 0.', 'error')
      return
    }
    setSavingLifestyle(true)
    setSaveError('')
    try {
      await updateMyLifestyle({
        role,
        sleepHabit,
        petPreference,
        smokingPreference,
        maxBudget: budget,
        preferredArea: preferredArea.trim() || undefined,
      })
      await refreshProfile()
      showToast('Đã lưu lối sống & vai trò.', 'success')
      if (!lifestyleOnly) setEditing(false)
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Chưa lưu được lối sống. Hãy thử lại.'))
    } finally {
      setSavingLifestyle(false)
    }
  }

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyFile) {
      showToast('Chọn ảnh hoặc PDF giấy tờ xác minh.', 'error')
      return
    }
    setVerifyBusy(true)
    try {
      const uploaded = await uploadImages([verifyFile], 'landlord-verification')
      const documentUrl = uploaded[0]?.url
      if (!documentUrl) throw new Error('Upload thất bại')
      const next = await submitLandlordVerification({ documentUrl, note: verifyNote || undefined })
      setVerification(next)
      setVerifyFile(null)
      setVerifyNote('')
      await refreshProfile()
      showToast('Đã gửi yêu cầu xác minh chủ nhà.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Gửi xác minh thất bại'), 'error')
    } finally {
      setVerifyBusy(false)
    }
  }

  if (profileLoading && profileError) return <section className="profile-setup-notice" role="alert"><p>{profileError}</p><button className="btn btn-primary" type="button" onClick={() => void refreshProfile()}>Tải lại hồ sơ</button></section>

  if (profileLoading) {
    return (
      <main className={embedded ? 'map-embed profile-embed' : 'container page profile-page'}>
        <ProfileSkeleton />
      </main>
    )
  }


  return (
    <div data-glass-exclude className={`${embedded ? 'map-embed profile-embed' : 'container page profile-page'}${lifestyleOnly ? '' : ' profile-account'}`}>
      {!lifestyleOnly && <header className="profile-account-header">
        <div className="profile-account-header__identity">
          <button type="button" className="profile-account-avatar" onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy} aria-label="Đổi ảnh đại diện">
            {avatarPath ? <img src={avatarPath} alt="" /> : <span>{initials}</span>}
            <small>{avatarBusy ? 'Đang tải…' : 'Đổi ảnh'}</small>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => void handleAvatarPick(e.target.files?.[0] ?? null)} />
          <div><span className="profile-account-header__eyebrow">HOMEJI · TÀI KHOẢN CỦA BẠN</span><h1>{profile?.displayName || 'Chào bạn'}</h1><p>{userRoleLabel[profile?.role ?? UserRole.Renter]} · {profile?.isPremium ? profile.subscriptionBadge || 'Premium' : 'Gói miễn phí'}</p></div>
        </div>
        <Link className="profile-account-header__home" to="/">← Về trang chủ</Link>
      </header>}
      {!lifestyleOnly && !editing && !needsProfileSetup ? <ProfileOverview profile={profile!} verificationStatus={verifyStatus} onEdit={next => { setTab(next); setEditing(true); setSaveError('') }} /> : null}
      <div className="profile-workspace__content" hidden={!lifestyleOnly && !editing && !needsProfileSetup}>
      {!lifestyleOnly && <header className="profile-editor-heading">
        {!needsProfileSetup && <button type="button" className="profile-text-action" disabled={savingProfile || savingLifestyle || verifyBusy} onClick={() => { setEditing(false); setSaveError('') }}>← Tổng quan tài khoản</button>}
        <h2>{tab === 'basic' ? 'Thông tin cơ bản' : tab === 'lifestyle' ? 'Nhu cầu ở ghép' : 'Xác minh chủ nhà'}</h2>
        <p>{tab === 'basic' ? 'Tên là thông tin cần lưu để bắt đầu. Bạn có thể bổ sung các mục khác sau.' : tab === 'lifestyle' ? 'Phần này tùy chọn, giúp tìm người ở ghép phù hợp với bạn.' : 'Gửi giấy tờ và theo dõi kết quả xét duyệt tại đây.'}</p>
      </header>}
      {needsProfileSetup ? <aside className="profile-setup-notice" role="status" data-glass-exclude>
        <div><strong>Bước tiếp theo: lưu thông tin tài khoản</strong><p>Nhập tên ở mục Thông tin cơ bản rồi chọn Lưu thông tin. Sau đó bạn có thể nạp tiền và thanh toán; không cần điền lối sống.</p></div>
        {tab !== 'basic' ? lifestyleOnly
          ? <Link className="btn btn-primary" to={profileSetupUrl('/?section=invitations')}>Mở Thông tin cơ bản</Link>
          : <button className="btn btn-primary" type="button" onClick={() => setTab('basic')}>Mở Thông tin cơ bản</button> : null}
      </aside> : returnTo ? <aside className="profile-setup-notice" role="status" data-glass-exclude>
        <p>Thông tin tài khoản đã được lưu. Bạn có thể quay lại và tiếp tục thao tác.</p><Link className="btn btn-primary" to={returnTo}>Quay lại thao tác trước</Link>
      </aside> : null}

      {saveError ? <p className="profile-setup-notice" role="alert">{saveError}</p> : null}
      {tab === 'basic' ? (
        <form className="profile-section map-motion-fade-up" onSubmit={(e) => void handleProfileSave(e)}>
          <header className="profile-section__head">
            <h3>Thông tin cơ bản</h3>
          </header>

          <div className="profile-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">
                Họ tên
              </label>
              <input
                id="profile-name"
                className="form-input"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  setProfileErrors((current) => ({ ...current, displayName: undefined }))
                }}
                required
                maxLength={USER_INPUT_LIMITS.fullName}
                autoComplete="name"
                aria-invalid={Boolean(profileErrors.displayName)}
                aria-describedby={profileErrors.displayName ? 'profile-name-error' : undefined}
              />
              {profileErrors.displayName ? (
                <small id="profile-name-error" className="profile-field-error" role="alert">{profileErrors.displayName}</small>
              ) : null}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-phone">
                Số điện thoại
              </label>
              <input
                id="profile-phone"
                className="form-input"
                value={phone}
                onChange={(e) => {
                  setPhone(sanitizePhoneInput(e.target.value))
                  setProfileErrors((current) => ({ ...current, phone: undefined }))
                }}
                maxLength={USER_INPUT_LIMITS.phone}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="VD: 0901234567"
                aria-invalid={Boolean(profileErrors.phone)}
                aria-describedby={profileErrors.phone ? 'profile-phone-error' : 'profile-phone-hint'}
              />
              {profileErrors.phone ? (
                <small id="profile-phone-error" className="profile-field-error" role="alert">{profileErrors.phone}</small>
              ) : (
                <small id="profile-phone-hint" className="profile-field-hint">Gồm đúng 10 chữ số, bắt đầu bằng 0.</small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-school">
                Trường học
              </label>
              <ChoicePicker
                id="profile-school"
                className="form-select"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              >
                <option value="">Chọn trường tại Thủ Đức</option>
                {THU_DUC_SCHOOLS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </ChoicePicker>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-area">
                Khu vực đang ở
              </label>
              <ChoicePicker
                id="profile-area"
                className="form-select"
                value="Thủ Đức"
                disabled
              >
                <option value="Thủ Đức">Thủ Đức</option>
              </ChoicePicker>
              <small className="profile-field-hint">
                Hiện tại Homeji chỉ hỗ trợ khu vực Thủ Đức.
              </small>
            </div>
            <div className="form-group profile-grid__full">
              <label className="form-label" htmlFor="profile-address">
                Địa chỉ liên hệ
              </label>
              <input
                id="profile-address"
                className="form-input"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                maxLength={500}
                placeholder="Địa chỉ để chủ nhà / người thuê liên hệ"
              />
            </div>
            <div className="form-group profile-grid__full">
              <label className="form-label" htmlFor="profile-need">
                Nhu cầu thuê
              </label>
              <textarea
                id="profile-need"
                className="form-input profile-textarea"
                value={rentalNeed}
                onChange={(e) => setRentalNeed(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Mô tả ngắn: ngân sách, tiện nghi, thời gian chuyển vào…"
              />
            </div>
          </div>

          <div className="profile-section__actions">
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Đang lưu…' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'lifestyle' ? (
        <form className="profile-section map-motion-fade-up" onSubmit={(e) => void handleLifestyleSave(e)}>
          <header className="profile-section__head">
            <h3>{lifestyleOnly ? 'Thông tin lối sống' : 'Lối sống & vai trò'}</h3>
            <p>Dùng để gợi ý phòng / ở ghép phù hợp hơn.</p>
          </header>

          {!lifestyleOnly ? <div className="form-group">
            <span className="form-label">Vai trò</span>
            <div className="profile-role-toggle" role="group" aria-label="Chọn vai trò">
              <button
                type="button"
                className={`profile-role-toggle__btn${role === UserRole.Renter ? ' is-active' : ''}`}
                onClick={() => setRole(UserRole.Renter)}
              >
                {userRoleLabel[UserRole.Renter]}
              </button>
              <button
                type="button"
                className={`profile-role-toggle__btn${role === UserRole.Landlord ? ' is-active' : ''}`}
                onClick={() => setRole(UserRole.Landlord)}
              >
                {userRoleLabel[UserRole.Landlord]}
              </button>
            </div>
          </div> : null}

          <div className="profile-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-preferred-area">Khu vực muốn ở</label>
              <input id="profile-preferred-area" className="form-input" value={preferredArea}
                maxLength={150} onChange={(e) => setPreferredArea(e.target.value)}
                placeholder="VD: gần UEL, Linh Trung" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-sleep">
                Thói quen ngủ
              </label>
              <ChoicePicker
                id="profile-sleep"
                className="form-select"
                value={sleepHabit}
                onChange={(e) => setSleepHabit(Number(e.target.value) as SleepHabit)}
              >
                {Object.entries(sleepHabitLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </ChoicePicker>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-pet">
                Thú cưng
              </label>
              <ChoicePicker
                id="profile-pet"
                className="form-select"
                value={petPreference}
                onChange={(e) => setPetPreference(Number(e.target.value) as PetPreference)}
              >
                {Object.entries(petPreferenceLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </ChoicePicker>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-smoke">
                Hút thuốc
              </label>
              <ChoicePicker
                id="profile-smoke"
                className="form-select"
                value={smokingPreference}
                onChange={(e) => setSmokingPreference(Number(e.target.value) as SmokingPreference)}
              >
                {Object.entries(smokingPreferenceLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </ChoicePicker>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-budget">
                Ngân sách tối đa
              </label>
              <input
                id="profile-budget"
                className="form-input"
                type="number"
                min={0.01}
                step="any"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="VD: 3500000"
              />
              {maxBudget ? (
                <small className="profile-field-hint">{formatPrice(Number(maxBudget) || 0)}</small>
              ) : null}
            </div>
          </div>

          <div className="profile-section__actions">
            <button type="submit" className="btn btn-primary" disabled={savingLifestyle || needsProfileSetup}>
              {savingLifestyle ? 'Đang lưu…' : 'Lưu lối sống'}
            </button>
          </div>
        </form>
      ) : null}

      {tab === 'verify' && showVerifyTab ? (
        <form className="profile-section map-motion-fade-up" onSubmit={(e) => void handleSubmitVerification(e)}>
          <header className="profile-section__head">
            <h3>Xác minh chủ nhà</h3>
            <p>Gửi giấy tờ để tăng độ tin cậy khi đăng tin cho thuê.</p>
          </header>

          <div className={`profile-verify-status is-${verifyStatus}`}>
            <strong>{landlordVerificationLabel[verifyStatus]}</strong>
            {verification?.reviewNote ? <p>Ghi chú duyệt: {verification.reviewNote}</p> : null}
            {verification?.createdAt ? <small>Gửi lúc {formatDate(verification.createdAt)}</small> : null}
          </div>

          {verifyStatus !== LandlordVerificationStatus.Verified &&
          verifyStatus !== LandlordVerificationStatus.Pending ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-verify-file">
                  Giấy tờ (ảnh / PDF)
                </label>
                <input
                  id="profile-verify-file"
                  className="form-input marketplace-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setVerifyFile(e.target.files?.[0] ?? null)}
                />
                {verifyFile ? <small className="profile-field-hint">{verifyFile.name}</small> : null}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-verify-note">
                  Ghi chú
                </label>
                <input
                  id="profile-verify-note"
                  className="form-input"
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  placeholder="Tùy chọn"
                />
              </div>
              <div className="profile-section__actions">
                <button type="submit" className="btn btn-primary" disabled={verifyBusy}>
                  {verifyBusy ? 'Đang gửi…' : 'Gửi xác minh'}
                </button>
              </div>
            </>
          ) : verifyStatus === LandlordVerificationStatus.Pending ? (
            <p className="profile-verify-wait">Yêu cầu đang được xét duyệt. Bạn sẽ nhận thông báo khi có kết quả.</p>
          ) : (
            <p className="profile-verify-wait">Tài khoản chủ nhà đã được xác minh.</p>
          )}
        </form>
      ) : null}

      </div>
      <MapToast
        message={toast?.message ?? null}
        tone={toast?.tone ?? 'info'}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
