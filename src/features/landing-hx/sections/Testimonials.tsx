import { Quote, Star } from 'lucide-react'
import { SHOW_SAMPLE_TESTIMONIALS, TESTIMONIALS, type Testimonial } from '../../../lib/mock/homeji'
import { RevealGroup, RevealItem } from '../motion/Reveal'
import { Container, SectionHeading } from '../ui/primitives'
import { initials } from './format'

function Stars({ rating }: { rating: number }) {
  return (
    <p className="hx-quote__stars" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} aria-hidden="true" className={index < rating ? 'is-on' : undefined} />
      ))}
    </p>
  )
}

function TestimonialItem({ item }: { item: Testimonial }) {
  return (
    <figure className={`hx-quote hx-quote--${item.audience}`}>
      <Quote className="hx-quote__mark" aria-hidden="true" />
      <Stars rating={item.rating} />
      <blockquote className="hx-quote__text">
        <p>{item.quote}</p>
      </blockquote>
      <figcaption className="hx-quote__who">
        <span className="hx-quote__avatar" aria-hidden="true">{initials(item.name)}</span>
        <span>
          <span className="hx-quote__name">{item.name}</span>
          <span className="hx-quote__role">{item.role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/** Sample quotes render in development only until real testimonials exist. */
export function Testimonials() {
  if (!SHOW_SAMPLE_TESTIMONIALS || TESTIMONIALS.length === 0) return null
  return (
    <section id="danh-gia" className="hx-section hx-quotes" aria-labelledby="hx-quotes-title">
      <Container>
        <SectionHeading
          id="hx-quotes-title"
          title="Người trẻ nói gì về Homeji"
          lead="Từ sinh viên năm nhất tới chủ trọ có phòng cần cho thuê."
        />
        <p className="hx-quotes__sample">Dữ liệu mẫu, chỉ hiện ở bản phát triển.</p>
        <RevealGroup as="ul" className="hx-quotes__grid">
          {TESTIMONIALS.map(item => (
            <RevealItem as="li" key={item.id}>
              <TestimonialItem item={item} />
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  )
}
