import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMySocialContacts, updateMySocialContacts, type ProfileSocialContacts } from '../../api/profileContacts'
import { facebookContactHref, normalizeZaloPhone } from '../../lib/profileContacts'
import { getErrorMessage } from '../../lib/errors'
import { SocialContactLinks } from './SocialContactLinks'

export function PremiumContactEditor() {
  const [profile, setProfile] = useState<ProfileSocialContacts | null>(null)
  const [facebook, setFacebook] = useState('')
  const [zalo, setZalo] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState(Date.now)
  const lock = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    void getMySocialContacts(controller.signal).then(value => {
      if (!controller.signal.aborted) { setProfile(value); setFacebook(value.facebookUrl ?? ''); setZalo(value.zaloPhone ?? ''); setError('') }
    }).catch(error => { if (!controller.signal.aborted) setError(getErrorMessage(error, 'Chưa tải được thông tin liên hệ.')) })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => {
    const expires = Date.parse(profile?.premiumExpiresAt ?? '')
    if (!Number.isFinite(expires) || expires <= now) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2_147_483_647, expires - now + 1))
    return () => clearTimeout(timer)
  }, [profile?.premiumExpiresAt, now])
  async function save(remove = false) {
    if (!profile || lock.current) return
    const nextFacebook = remove ? '' : facebook.trim()
    const nextZalo = remove ? '' : zalo.trim()
    if (nextFacebook && !facebookContactHref(nextFacebook)) { setError('Nhập link Facebook hợp lệ, bắt đầu bằng https://www.facebook.com/.'); return }
    if (nextZalo && !normalizeZaloPhone(nextZalo)) { setError('Nhập số Zalo Việt Nam gồm 10 số, ví dụ 0901234567.'); return }
    lock.current = true; setSaving(true); setError(''); setNotice('')
    try {
      const updated = await updateMySocialContacts({ facebookUrl: nextFacebook || null, zaloPhone: nextZalo ? normalizeZaloPhone(nextZalo) : null })
      setProfile(updated); setFacebook(updated.facebookUrl ?? ''); setZalo(updated.zaloPhone ?? ''); setNotice('Đã lưu thông tin liên hệ.')
    } catch (error) { setError(getErrorMessage(error, 'Chưa lưu được thông tin liên hệ.')) }
    finally { lock.current = false; setSaving(false) }
  }
  const premium = profile?.isPremium && !!profile.premiumExpiresAt && Date.parse(profile.premiumExpiresAt) > now
  return <section className="premium-contact-editor profile-information" aria-labelledby="premium-contact-heading">
    <header><h2 id="premium-contact-heading">Kết nối với bạn <span>PREMIUM</span></h2><p>Facebook và Zalo được hiển thị trong hồ sơ công khai và phần liên hệ trên tin phòng khi Premium còn hiệu lực.</p></header>
    {error ? <p role="alert">{error} {!profile ? <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button> : null}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {!profile ? !error && <p role="status">Đang tải thông tin liên hệ…</p> : <>
      <form onSubmit={event => { event.preventDefault(); void save() }}>
        <fieldset disabled={!premium || saving}>
          <label>Link Facebook<input type="url" maxLength={500} value={facebook} onChange={event => setFacebook(event.target.value)} placeholder="https://www.facebook.com/ten.cua.ban" autoComplete="url" /></label>
          <label>Số Zalo<input type="tel" inputMode="tel" maxLength={30} value={zalo} onChange={event => setZalo(event.target.value)} placeholder="0901234567" autoComplete="tel" /></label>
        </fieldset>
        {premium ? <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu liên hệ'}</button> : <p className="premium-contact-editor__locked">Mở Facebook và Zalo trên hồ sơ với Premium. <Link to="/?section=payments&tab=plans">Xem gói Premium</Link></p>}
      </form>
      {!premium && (profile.facebookUrl || profile.zaloPhone) ? <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => void save(true)}>Xóa liên hệ đã lưu</button> : null}
      <div className="premium-contact-editor__preview"><strong>Khách khác sẽ thấy</strong><SocialContactLinks facebookUrl={facebook} zaloPhone={zalo} createdAt={profile.createdAt} isPremium={!!premium} requireAuth={false} /></div>
    </>}
  </section>
}
