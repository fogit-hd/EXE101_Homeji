import { Camera, Flag, IdCard, ReceiptText } from 'lucide-react'
import type { ReactNode } from 'react'
import { RevealGroup, RevealItem } from '../motion/Reveal'
import { Container, SectionHeading } from '../ui/primitives'

/*
 * What the "Chủ nhà đã xác minh" badge actually checks. Restates the three
 * pillars of Homeji's verification standard (shown in the app's badge
 * explainer) and the report reasons the listing page offers. Keep it to what
 * moderation really does: no absolute "chặn 100% lừa đảo" promises.
 */
const CHECKS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <IdCard />,
    title: 'Đúng người có quyền cho thuê',
    body: 'Homeji đối chiếu CCCD gắn chip của người đăng. Nếu họ quản lý thay chủ nhà, tin cần thêm hợp đồng ủy quyền hợp lệ.',
  },
  {
    icon: <Camera />,
    title: 'Ảnh chụp đúng căn phòng',
    body: 'Ảnh được đối chiếu tận nơi hoặc qua video kiểm duyệt. Không nhận ảnh dựng 3D làm phòng trông rộng hơn thực tế.',
  },
  {
    icon: <ReceiptText />,
    title: 'Giá ghi đủ từng khoản',
    body: 'Tiền thuê, tiền cọc, điện, nước, internet, gửi xe và phí dịch vụ đều hiện trên tin, để bạn tính trước khi đi xem.',
  },
]

export function TrustStandard() {
  return (
    <section id="xac-minh" className="hx-section tw:border-y tw:border-line tw:bg-surface" aria-labelledby="hx-trust-title">
      <Container>
        <div className="tw:grid tw:gap-10 tw:lg:grid-cols-12 tw:lg:gap-x-16 tw:lg:gap-y-8">
          <div className="tw:lg:col-span-5">
            <SectionHeading
              id="hx-trust-title"
              title="Huy hiệu “Chủ nhà đã xác minh” nghĩa là gì?"
              lead="Mọi tin có huy hiệu này đã qua ba bước kiểm tra của đội kiểm duyệt Homeji trước khi hiển thị."
            />
          </div>

          <RevealGroup as="ol" className="tw:m-0 tw:grid tw:list-none tw:gap-4 tw:p-0 tw:lg:col-span-7 tw:lg:row-span-2">
            {CHECKS.map(check => (
              <RevealItem
                as="li"
                key={check.title}
                className="tw:grid tw:grid-cols-[auto_1fr] tw:gap-x-4 tw:gap-y-1 tw:rounded-2xl tw:border tw:border-line tw:bg-canvas tw:p-5 tw:sm:p-6"
              >
                <span
                  className="tw:row-span-2 tw:grid tw:size-11 tw:place-items-center tw:rounded-xl tw:bg-brand-soft tw:text-brand tw:[&>svg]:size-5"
                  aria-hidden="true"
                >
                  {check.icon}
                </span>
                <h3 className="tw:m-0 tw:text-lg tw:font-semibold tw:leading-snug tw:text-ink">{check.title}</h3>
                <p className="tw:m-0 tw:text-[15px] tw:leading-relaxed tw:text-ink-muted">{check.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>

          <div className="tw:flex tw:lg:col-span-5 tw:lg:self-end tw:gap-3 tw:rounded-2xl tw:border tw:border-line tw:bg-canvas tw:p-5">
            <Flag className="tw:mt-0.5 tw:size-5 tw:shrink-0 tw:text-brand" aria-hidden="true" />
            <p className="tw:m-0 tw:text-[15px] tw:leading-relaxed tw:text-ink-muted">
              <strong className="tw:font-semibold tw:text-ink">Thấy điều gì không đúng?</strong>{' '}
              Bị đòi chuyển cọc trước khi xem phòng, phòng đã cho thuê, sai giá hay ảnh khác thực tế: bấm “Báo cáo tin này” trên trang tin. Báo cáo đi thẳng tới đội kiểm duyệt.
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
