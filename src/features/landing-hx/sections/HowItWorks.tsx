import { useState } from 'react'
import { Megaphone, Search } from 'lucide-react'
import { HOW_IT_WORKS } from '../../../lib/mock/homeji'
import { RevealGroup, RevealItem } from '../motion/Reveal'
import { ButtonLink } from '../ui/Button'
import { Container, SectionHeading } from '../ui/primitives'
import { SegmentedControl } from '../ui/SegmentedControl'

type Audience = 'seeker' | 'poster'

const TABS = [
  { value: 'seeker', label: 'Người tìm phòng', icon: <Search aria-hidden="true" /> },
  { value: 'poster', label: 'Người đăng tin', icon: <Megaphone aria-hidden="true" /> },
] as const

const CTA: Record<Audience, { label: string; to: string }> = {
  seeker: { label: 'Bắt đầu tìm phòng', to: '#tin-noi-bat' },
  poster: { label: 'Đăng tin ngay', to: '/posts/new' },
}

export function HowItWorks() {
  const [audience, setAudience] = useState<Audience>('seeker')
  const steps = HOW_IT_WORKS[audience]

  return (
    <section id="cach-hoat-dong" className="hx-section hx-how" aria-labelledby="hx-how-title">
      <Container>
        <SectionHeading
          id="hx-how-title"
          title="Homeji hoạt động thế nào?"
          lead="Ba bước, dù bạn đang tìm chỗ ở hay có phòng muốn cho thuê."
          align="center"
        />
        <div className="hx-how__tabs">
          <SegmentedControl
            mode="tabs"
            label="Chọn vai trò"
            options={TABS}
            value={audience}
            onChange={setAudience}
            tabId={value => `hx-how-tab-${value}`}
            panelId={value => `hx-how-panel-${value}`}
          />
        </div>

        <div id={`hx-how-panel-${audience}`} role="tabpanel" aria-labelledby={`hx-how-tab-${audience}`}>
          <RevealGroup key={audience} as="ol" className="hx-how__steps">
            {steps.map((step, index) => (
              <RevealItem as="li" key={step.title} className="hx-how__step">
                <span className="hx-how__num" aria-hidden="true">{index + 1}</span>
                <h3 className="hx-how__title">
                  <span className="hx-sr-only">Bước {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="hx-how__body">{step.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
          <div className="hx-how__cta">
            <ButtonLink to={CTA[audience].to} variant={audience === 'poster' ? 'accent' : 'primary'} size="lg">
              {CTA[audience].label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}
