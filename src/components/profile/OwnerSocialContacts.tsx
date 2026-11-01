import { useEffect, useState } from 'react'
import { getPublicContactProfile, type PublicContactProfile } from '../../api/profileContacts'
import { getErrorMessage } from '../../lib/errors'
import { SocialContactLinks } from './SocialContactLinks'

export function OwnerSocialContacts({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<PublicContactProfile | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void getPublicContactProfile(userId, controller.signal).then(value => { if (!controller.signal.aborted) { setProfile(value); setError('') } })
      .catch(error => { if (!controller.signal.aborted) setError(getErrorMessage(error, 'Chưa tải được thông tin liên hệ mở rộng.')) })
    return () => controller.abort()
  }, [userId, attempt])
  return error ? <p className="social-contact-links__tenure" role="status">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p>
    : profile ? <SocialContactLinks {...profile} /> : <p className="social-contact-links__tenure" role="status">Đang tải thông tin người đăng…</p>
}
