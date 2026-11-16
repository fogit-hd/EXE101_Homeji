import { ArrowRight, Megaphone } from 'lucide-react'
import { Reveal } from '../motion/Reveal'
import { ButtonLink } from '../ui/Button'
import { Container } from '../ui/primitives'

export function CtaBand() {
  return (
    <section className="hx-section hx-cta" aria-labelledby="hx-cta-title">
      <Container>
        <Reveal className="hx-cta__band">
          <div className="hx-cta__copy">
            <h2 id="hx-cta-title" className="hx-cta__title">Tổ ấm tiếp theo của bạn đang chờ.</h2>
            <p className="hx-cta__lead">Tìm phòng đã xác minh quanh nơi bạn học và làm, hoặc đăng phòng trống để người thuê tìm tới bạn.</p>
          </div>
          <div className="hx-cta__actions">
            <ButtonLink to="#tin-noi-bat" variant="accent" size="lg" trailingIcon={<ArrowRight aria-hidden="true" />}>
              Tìm phòng ngay
            </ButtonLink>
            <ButtonLink to="/posts/new" variant="outline" size="lg" icon={<Megaphone aria-hidden="true" />} className="hx-cta__secondary">
              Đăng tin cho thuê
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
