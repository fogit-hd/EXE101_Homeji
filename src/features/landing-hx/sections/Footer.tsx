import { Facebook, Instagram, MapPin, MessageCircle, Youtube } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT, FOOTER_COLUMNS } from '../../../lib/mock/homeji'
import { Container } from '../ui/primitives'
import { Logo } from './Navbar'

/** No official social pages exist yet; icons render as "sắp ra mắt" until a URL is set. */
const SOCIAL: { label: string; icon: ReactNode; href: string | null }[] = [
  { label: 'Facebook', icon: <Facebook />, href: null },
  { label: 'Instagram', icon: <Instagram />, href: null },
  { label: 'YouTube', icon: <Youtube />, href: null },
]

function FooterLink({ label, to }: { label: string; to: string }) {
  if (to.startsWith('#')) return <a className="hx-footer__link" href={to}>{label}</a>
  return <Link className="hx-footer__link" to={to}>{label}</Link>
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="hx-footer">
      <Container>
        <div className="hx-footer__top">
          <div className="hx-footer__brand">
            <Logo />
            <p className="hx-footer__about">
              Nền tảng tìm phòng trọ, bạn ở ghép và đăng tin cho thuê dành cho người trẻ ở TP.HCM.
            </p>
            <ul className="hx-footer__contact">
              <li><MapPin aria-hidden="true" /> {CONTACT.area}</li>
              <li><MessageCircle aria-hidden="true" /> Hỗ trợ qua tin nhắn trong ứng dụng</li>
            </ul>
          </div>
          <nav className="hx-footer__cols" aria-label="Liên kết cuối trang">
            {FOOTER_COLUMNS.map(column => (
              <div key={column.title} className="hx-footer__col">
                <h2 className="hx-footer__title">{column.title}</h2>
                <ul>
                  {column.links.map(link => (
                    <li key={link.label}><FooterLink {...link} /></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="hx-footer__bottom">
          <p>© {year} Homeji. Bảo lưu mọi quyền.</p>
          <ul className="hx-footer__social" aria-label="Mạng xã hội">
            {SOCIAL.map(item => (
              <li key={item.label}>
                {item.href ? (
                  <a className="hx-footer__social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={`Homeji trên ${item.label}`}>
                    {item.icon}
                  </a>
                ) : (
                  <span className="hx-footer__social-link is-soon" role="img" aria-label={`${item.label}: sắp ra mắt`} title={`${item.label}: sắp ra mắt`}>
                    {item.icon}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  )
}
