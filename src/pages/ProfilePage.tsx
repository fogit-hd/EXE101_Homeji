import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useHomejiLoading } from '../components/HomejiLoader'
import { ContentSkeleton } from '../components/ContentSkeleton'
import { MapToast } from '../components/map/MapToast'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import {
  normalizeFullName,
  sanitizePhoneInput,
  USER_INPUT_LIMITS,
  validateFullName,
  validateVietnamPhone,
} from '../lib/userInputValidation'
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
import './MarketplacePage.css'
import './ProfilePage.css'

type ProfileTab = 'basic' | 'lifestyle' | 'verify'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

export function ProfilePage({ embedded = false }: { embedded?: boolean }) {
  const { profile, refreshProfile, needsProfileSetup } = useAuth()
  const [tab, setTab] = useState<ProfileTab>('basic')
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
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingLifestyle, setSavingLifestyle] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [verification, setVerification] = useState<LandlordVerification | null>(null)
  const [verifyNote, setVerifyNote] = useState('')
  const [verifyFile, setVerifyFile] = useState<File | null>(null)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const profileLoading = !profile && !needsProfileSetup
  const { showLoader } = useHomejiLoading(profileLoading)

  const showVerifyTab = role === UserRole.Landlord || profile?.role === UserRole.Landlord
  const verifyStatus =
    verification?.status ?? profile?.landlordVerificationStatus ?? LandlordVerificationStatus.NotSubmitted

  useEffect(() => {
    if (!profile) return
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
  }, [profile])

  useEffect(() => {
    if (!showVerifyTab && tab === 'verify') setTab('basic')
  }, [showVerifyTab, tab])

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
    } catch (err) {
      showToast(getErrorMessage(err, 'Cập nhật thất bại'), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLifestyleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingLifestyle(true)
    try {
      await updateMyLifestyle({
        role,
        sleepHabit,
        petPreference,
        smokingPreference,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        preferredArea: 'Thủ Đức',
      })
      await refreshProfile()
      showToast('Đã lưu lối sống & vai trò.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Cập nhật thất bại'), 'error')
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

  if (showLoader) {
    return (
      <main className={embedded ? 'map-embed' : 'container page'}>
        <ContentSkeleton variant="profile" label="Đang tải hồ sơ…" />
      </main>
    )
  }

  const tabCols = showVerifyTab ? 3 : 2

  return (
    <div className={embedded ? 'map-embed profile-embed' : 'container page profile-page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Hồ sơ của tôi</h1>
          <p className="page-subtitle">Quản lý thông tin tài khoản và lối sống trên Homeji</p>
        </>
      ) : null}

      <section className="profile-hero map-motion-fade-up">
        <div className="profile-hero__avatar-wrap" aria-busy={avatarBusy}>
          <button
            type="button"
            className="profile-hero__avatar map-motion-press"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarBusy}
            aria-label={avatarPath ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện lên'}
          >
            {avatarPath ? (
              <img src={avatarPath} alt="" className="profile-hero__avatar-img" />
            ) : (
              <span>{initials}</span>
            )}
            <span className="profile-hero__avatar-edit">{avatarBusy ? '…' : 'Đổi'}</span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => void handleAvatarPick(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="profile-hero__meta">
          <h2 className="profile-hero__name">{displayName || profile?.displayName || 'Người dùng Homeji'}</h2>
          <div className="profile-hero__badges">
            <span className="profile-badge">{userRoleLabel[role] ?? userRoleLabel[UserRole.Renter]}</span>
            {profile?.isPremium ? (
              <span className="profile-badge is-premium">{profile.subscriptionBadge || 'Premium'}</span>
            ) : (
              <span className="profile-badge">Basic</span>
            )}
            {role === UserRole.Landlord || profile?.role === UserRole.Landlord ? (
              <span
                className={`profile-badge is-verify${
                  verifyStatus === LandlordVerificationStatus.Verified
                    ? ' is-ok'
                    : verifyStatus === LandlordVerificationStatus.Pending
                      ? ' is-pending'
                      : verifyStatus === LandlordVerificationStatus.Rejected
                        ? ' is-bad'
                        : ''
                }`}
              >
                {landlordVerificationLabel[verifyStatus]}
              </span>
            ) : null}
            {!profile?.onboardingCompleted ? (
              <span className="profile-badge is-warn">Chưa hoàn tất onboarding</span>
            ) : null}
          </div>
          <p className="profile-hero__hint">
            {profile?.updatedAt
              ? `Cập nhật ${formatDate(profile.updatedAt)}`
              : 'Hoàn thiện hồ sơ để dùng tốt hơn các tính năng Homeji'}
          </p>
          <div className="profile-hero__avatar-actions">
            <button
              type="button"
              className="profile-avatar-upload map-motion-press"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 3a1 1 0 0 1 1 1v7.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 14a1 1 0 0 1 1 1v3h12v-3a1 1 0 1 1 2 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a1 1 0 0 1 1-1Z"
                />
              </svg>
              {avatarBusy ? 'Đang tải ảnh…' : avatarPath ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện'}
            </button>
            <span className="profile-avatar-help">JPG, PNG hoặc WebP · tối đa 5 MB</span>
          </div>
        </div>
      </section>

      <div
        className="tabs map-section-tabs"
        style={{ ['--map-tab-cols' as string]: tabCols }}
        role="tablist"
        aria-label="Phần hồ sơ"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'basic'}
          className={`tab ${tab === 'basic' ? 'active' : ''}`}
          onClick={() => setTab('basic')}
        >
          Cơ bản
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'lifestyle'}
          className={`tab ${tab === 'lifestyle' ? 'active' : ''}`}
          onClick={() => setTab('lifestyle')}
        >
          Lối sống
        </button>
        {showVerifyTab ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'verify'}
            className={`tab ${tab === 'verify' ? 'active' : ''}`}
            onClick={() => setTab('verify')}
          >
            Xác minh
          </button>
        ) : null}
      </div>

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
              <select
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
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-area">
                Khu vực đang ở
              </label>
              <select
                id="profile-area"
                className="form-select"
                value="Thủ Đức"
                disabled
              >
                <option value="Thủ Đức">Thủ Đức</option>
              </select>
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
            <h3>Lối sống & vai trò</h3>
            <p>Dùng để gợi ý phòng / ở ghép phù hợp hơn.</p>
          </header>

          <div className="form-group">
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
          </div>

          <div className="profile-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-sleep">
                Thói quen ngủ
              </label>
              <select
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
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-pet">
                Thú cưng
              </label>
              <select
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
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-smoke">
                Hút thuốc
              </label>
              <select
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
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-budget">
                Ngân sách tối đa
              </label>
              <input
                id="profile-budget"
                className="form-input"
                type="number"
                min={0}
                step={100000}
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
            <button type="submit" className="btn btn-primary" disabled={savingLifestyle}>
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

      <MapToast
        message={toast?.message ?? null}
        tone={toast?.tone ?? 'info'}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
