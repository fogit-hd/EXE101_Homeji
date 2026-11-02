import { useEffect, useState } from 'react'
import { getPublicContactProfile, type PublicContactProfile } from '../../api/profileContacts'
import { getErrorMessage } from '../../lib/errors'
import { SocialContactLinks } from './SocialContactLinks'
import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext.logic'
import { ContactBrandIcon } from './ContactBrandIcon'
import './SocialContactLinks.css'

export function OwnerSocialContacts({ userId }: { userId: string }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [profile, setProfile] = useState<PublicContactProfile | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!isAuthenticated) return
    const controller = new AbortController()
    void getPublicContactProfile(userId, controller.signal).then(value => { if (!controller.signal.aborted) { setProfile(value); setError('') } })
      .catch(error => { if (!controller.signal.aborted) setError(getErrorMessage(error, 'Chưa tải được thông tin liên hệ mở rộng.')) })
    return () => controller.abort()
  }, [userId, attempt, isAuthenticated])
  if (isLoading) return <p className="social-contact-links__tenure" role="status">Đang kiểm tra đăng nhập…</p>
  if (!isAuthenticated) return <div className="social-contact-links social-contact-links__login-prompt">
    <div className="social-contact-links__actions">
      {(['facebook', 'zalo'] as const).map(brand => <button key={brand} type="button" className={`social-contact-links__${brand}`} aria-label={`Đăng nhập để xem liên hệ ${brand === 'facebook' ? 'Facebook' : 'Zalo'}`} onClick={() => openAuthModal({ intent: 'contact' })}><ContactBrandIcon brand={brand} />{brand === 'facebook' ? 'Facebook' : 'Zalo'}</button>)}
    </div>
  </div>
  return error ? <p className="social-contact-links__tenure" role="status">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p>
    : profile ? <SocialContactLinks {...profile} /> : <p className="social-contact-links__tenure" role="status">Đang tải thông tin người đăng…</p>
}
