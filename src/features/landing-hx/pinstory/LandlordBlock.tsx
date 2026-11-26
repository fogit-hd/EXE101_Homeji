import { ArrowRight, BadgeCheck, Megaphone, MessageCircle, ShieldCheck } from 'lucide-react'
import type { MouseEvent } from 'react'
import { jumpToSection } from '../jump'
import { ButtonLink } from '../ui/Button'
import { Container } from '../ui/primitives'

const POINTS = [
  { icon: <ShieldCheck aria-hidden="true" />, text: 'Xác minh CCCD một lần, dùng cho mọi tin' },
  { icon: <BadgeCheck aria-hidden="true" />, text: 'Tin gắn huy hiệu Đã xác minh' },
  { icon: <MessageCircle aria-hidden="true" />, text: 'Sinh viên nhắn trực tiếp, không qua môi giới' },
]

/** The landlord path, once, near the end of the page. */
export function LandlordBlock() {
  const toVerify = (event: MouseEvent) => {
    const target = document.getElementById('xac-minh')
    if (!target) return
    event.preventDefault()
    jumpToSection(target, '#xac-minh')
  }
  return (
    <section id="cho-chu-nha" className="hx-section hx-owner" aria-labelledby="hx-owner-title">
      <Container className="hx-owner__card">
        <div>
          <h2 id="hx-owner-title" className="hx-owner__title">Có phòng trống gần trường?</h2>
          <p className="hx-owner__lead">Xác minh một lần, tin của bạn đến thẳng sinh viên quanh Làng Đại học.</p>
        </div>
        <ul className="hx-owner__points">
          {POINTS.map(point => <li key={point.text}>{point.icon}{point.text}</li>)}
        </ul>
        <div className="hx-owner__actions">
          <ButtonLink to="/posts/new" variant="accent" size="lg" icon={<Megaphone aria-hidden="true" />}>Đăng tin cho thuê</ButtonLink>
          <a className="hx-sc-link" href="#xac-minh" onClick={toVerify}>Xem quy trình xác minh<ArrowRight aria-hidden="true" /></a>
        </div>
      </Container>
    </section>
  )
}
