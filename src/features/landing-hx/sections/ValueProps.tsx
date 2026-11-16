import { MousePointerClick, ShieldCheck, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { RevealGroup, RevealItem } from '../motion/Reveal'
import { Container, SectionHeading } from '../ui/primitives'

const VALUES: { icon: ReactNode; title: string; body: string; tone: 'emerald' | 'orange' | 'slate' }[] = [
  {
    icon: <ShieldCheck />,
    title: 'Chủ nhà đã xác minh, giá ghi rõ',
    body: 'Mỗi tin được kiểm duyệt trước khi hiển thị: đối chiếu danh tính chủ nhà, ảnh đúng căn phòng, giá ghi rõ từng khoản.',
    tone: 'emerald',
  },
  {
    icon: <UsersRound />,
    title: 'Tìm bạn ở ghép cùng tần số',
    body: 'Lọc theo giờ giấc, thói quen và ngân sách để gặp người ở chung hợp nhịp sống, không phải đoán qua vài dòng tin.',
    tone: 'orange',
  },
  {
    icon: <MousePointerClick />,
    title: 'Giao diện trực quan, thao tác siêu nhanh',
    body: 'Chọn khu vực, xem phòng, nhắn tin và hẹn lịch trong vài chạm. Không cần lướt hàng chục nhóm cho thuê.',
    tone: 'slate',
  },
]

export function ValueProps() {
  return (
    <section id="vi-sao" className="hx-section hx-values" aria-labelledby="hx-values-title">
      <Container>
        <SectionHeading
          id="hx-values-title"
          title="Tại sao chọn Homeji?"
          lead="Thuê trọ ở thành phố mới không nên là một canh bạc. Homeji gom những thứ bạn cần kiểm tra vào một chỗ."
        />
        <RevealGroup as="ul" className="hx-values__list">
          {VALUES.map(value => (
            <RevealItem as="li" key={value.title} className="hx-values__item">
              <h3 className="hx-values__title">
                <span className={`hx-values__icon hx-values__icon--${value.tone}`} aria-hidden="true">{value.icon}</span>
                {value.title}
              </h3>
              <p className="hx-values__body">{value.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  )
}
