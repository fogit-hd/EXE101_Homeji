import { facebookContactHref, memberTenure, normalizeZaloPhone } from '../../lib/profileContacts'
import './SocialContactLinks.css'

type Props = { facebookUrl?: string | null; zaloPhone?: string | null; createdAt: string; isPremium: boolean }
export function SocialContactLinks({ facebookUrl, zaloPhone, createdAt, isPremium }: Props) {
  const facebook = isPremium ? facebookContactHref(facebookUrl) : null
  const zalo = isPremium ? normalizeZaloPhone(zaloPhone ?? '') : ''
  const joined = Date.parse(createdAt)
  return <div className="social-contact-links">
    <p className="social-contact-links__tenure" title={Number.isFinite(joined) ? `Tham gia ngày ${new Date(joined).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : undefined}>{memberTenure(createdAt)}</p>
    {facebook || zalo ? <div className="social-contact-links__actions">
      {facebook ? <a className="social-contact-links__facebook" href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Liên hệ qua Facebook"><span aria-hidden="true">f</span> Facebook <span aria-hidden="true">↗</span></a> : null}
      {zalo ? <a className="social-contact-links__zalo" href={`https://zalo.me/${zalo}`} target="_blank" rel="noopener noreferrer" aria-label={`Liên hệ Zalo ${zalo}`}><span aria-hidden="true">Z</span> Zalo <span aria-hidden="true">↗</span></a> : null}
    </div> : null}
  </div>
}
