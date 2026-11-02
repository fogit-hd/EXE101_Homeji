import { useAuth } from '../../contexts/AuthContext'
import { useAuthModal } from '../../contexts/AuthModalContext.logic'
import { facebookContactHref, memberTenure, normalizeZaloPhone } from '../../lib/profileContacts'
import './SocialContactLinks.css'

type Props = { facebookUrl?: string | null; zaloPhone?: string | null; createdAt: string; isPremium: boolean; requireAuth?: boolean }
export function SocialContactLinks({ facebookUrl, zaloPhone, createdAt, isPremium, requireAuth = true }: Props) {
  const { isAuthenticated } = useAuth()
  const { openAuthModal } = useAuthModal()
  const facebook = isPremium ? facebookContactHref(facebookUrl) : null
  const zalo = isPremium ? normalizeZaloPhone(zaloPhone ?? '') : ''
  const canOpenContact = !requireAuth || isAuthenticated
  const requestLogin = () => openAuthModal({ intent: 'contact' })
  const joined = Date.parse(createdAt)
  return <div className="social-contact-links">
    <p className="social-contact-links__tenure" title={Number.isFinite(joined) ? `Tham gia ngày ${new Date(joined).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : undefined}>{memberTenure(createdAt)}</p>
    {facebook || zalo ? <div className="social-contact-links__actions">
      {facebook ? canOpenContact ? <a className="social-contact-links__facebook" href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Liên hệ qua Facebook"><span aria-hidden="true">f</span> Facebook <span aria-hidden="true">↗</span></a>
        : <button type="button" className="social-contact-links__facebook" onClick={requestLogin} aria-label="Đăng nhập để liên hệ qua Facebook"><span aria-hidden="true">f</span> Facebook <small>Đăng nhập</small></button> : null}
      {zalo ? canOpenContact ? <a className="social-contact-links__zalo" href={`https://zalo.me/${zalo}`} target="_blank" rel="noopener noreferrer" aria-label="Liên hệ qua Zalo"><span aria-hidden="true">Z</span> Zalo <span aria-hidden="true">↗</span></a>
        : <button type="button" className="social-contact-links__zalo" onClick={requestLogin} aria-label="Đăng nhập để liên hệ qua Zalo"><span aria-hidden="true">Z</span> Zalo <small>Đăng nhập</small></button> : null}
    </div> : null}
  </div>
}
