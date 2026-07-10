import { useEffect, useState } from 'react'
import {
  updateMyLifestyle,
  updateMyProfile,
} from '../api'
import {
  PetPreference,
  SleepHabit,
  SmokingPreference,
  UserRole,
} from '../api/types'
import { HomejiLoader, useHomejiLoading } from '../components/HomejiLoader'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/errors'
import {
  landlordVerificationLabel,
  petPreferenceLabel,
  sleepHabitLabel,
  smokingPreferenceLabel,
  userRoleLabel,
} from '../lib/labels'

export function ProfilePage() {
  const { profile, refreshProfile, needsProfileSetup } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [preferredArea, setPreferredArea] = useState('')
  const [role, setRole] = useState<UserRole>(UserRole.Renter)
  const [sleepHabit, setSleepHabit] = useState<SleepHabit>(SleepHabit.Unknown)
  const [petPreference, setPetPreference] = useState<PetPreference>(PetPreference.Unknown)
  const [smokingPreference, setSmokingPreference] = useState<SmokingPreference>(SmokingPreference.Unknown)
  const [maxBudget, setMaxBudget] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const profileLoading = !profile && !needsProfileSetup
  const { showLoader, onIntroComplete } = useHomejiLoading(profileLoading)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.displayName)
    setPhone(profile.phone ?? '')
    setSchool(profile.school ?? '')
    setPreferredArea(profile.preferredArea ?? '')
    setRole(profile.role)
    setSleepHabit(profile.sleepHabit)
    setPetPreference(profile.petPreference)
    setSmokingPreference(profile.smokingPreference)
    setMaxBudget(profile.maxBudget != null ? String(profile.maxBudget) : '')
  }, [profile])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await updateMyProfile({ displayName, phone, school, preferredArea })
      await refreshProfile()
      setMessage('Đã cập nhật hồ sơ.')
    } catch (err) {
      setError(getErrorMessage(err, 'Cập nhật thất bại'))
    }
  }

  const handleLifestyleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await updateMyLifestyle({
        role,
        sleepHabit,
        petPreference,
        smokingPreference,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        preferredArea,
      })
      await refreshProfile()
      setMessage('Đã cập nhật lối sống.')
    } catch (err) {
      setError(getErrorMessage(err, 'Cập nhật thất bại'))
    }
  }

  if (showLoader) {
    return <HomejiLoader fullPage label="Đang tải hồ sơ..." onIntroComplete={onIntroComplete} />
  }

  return (
    <div className="container page">
      <h1 className="page-title">Hồ sơ của tôi</h1>
      <p className="page-subtitle">
        {profile
          ? `${userRoleLabel[profile.role]} · ${landlordVerificationLabel[profile.landlordVerificationStatus]}`
          : 'Hoàn thiện thông tin để bắt đầu sử dụng Homeji'}
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="card" onSubmit={handleProfileSave}>
        <h2>Thông tin cơ bản</h2>
        <div className="form-group">
          <label className="form-label">Họ tên</label>
          <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Số điện thoại</label>
          <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Trường học</label>
          <input className="form-input" value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Khu vực ưa thích</label>
          <input className="form-input" value={preferredArea} onChange={(e) => setPreferredArea(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">Lưu thông tin</button>
      </form>

      <form className="card" style={{ marginTop: 24 }} onSubmit={handleLifestyleSave}>
        <h2>Lối sống & vai trò</h2>
        <div className="form-group">
          <label className="form-label">Vai trò</label>
          <select className="form-select" value={role} onChange={(e) => setRole(Number(e.target.value) as UserRole)}>
            <option value={UserRole.Renter}>{userRoleLabel[UserRole.Renter]}</option>
            <option value={UserRole.Landlord}>{userRoleLabel[UserRole.Landlord]}</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Thói quen ngủ</label>
          <select className="form-select" value={sleepHabit} onChange={(e) => setSleepHabit(Number(e.target.value) as SleepHabit)}>
            {Object.entries(sleepHabitLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Thú cưng</label>
          <select className="form-select" value={petPreference} onChange={(e) => setPetPreference(Number(e.target.value) as PetPreference)}>
            {Object.entries(petPreferenceLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Hút thuốc</label>
          <select className="form-select" value={smokingPreference} onChange={(e) => setSmokingPreference(Number(e.target.value) as SmokingPreference)}>
            {Object.entries(smokingPreferenceLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Ngân sách tối đa (VND)</label>
          <input className="form-input" type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">Lưu lối sống</button>
      </form>
    </div>
  )
}
