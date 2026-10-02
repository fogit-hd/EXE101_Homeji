import { Link } from 'react-router-dom'
import './LegalPage.css'

const UPDATED_AT = '03/10/2026'

function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <main className="legal-page">
      <article className="legal-page__card">
        <Link className="legal-page__back" to="/">
          ← Về Homeji
        </Link>
        <header>
          <p className="legal-page__eyebrow">HOMEJI</p>
          <h1>{title}</h1>
          <p className="legal-page__updated">Cập nhật lần cuối: {UPDATED_AT}</p>
          <p className="legal-page__intro">{intro}</p>
        </header>
        <div className="legal-page__content">{children}</div>
      </article>
    </main>
  )
}

export function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Chính sách quyền riêng tư"
      intro="Chính sách này giải thích cách Homeji thu thập, sử dụng và bảo vệ dữ liệu khi bạn sử dụng dịch vụ."
    >
      <section>
        <h2>Dữ liệu chúng tôi xử lý</h2>
        <p>
          Khi bạn đăng nhập bằng Google, Homeji nhận thông tin hồ sơ cơ bản mà bạn cho phép,
          gồm mã định danh tài khoản, tên, địa chỉ email và ảnh đại diện. Homeji không nhận mật
          khẩu Google của bạn.
        </p>
        <p>
          Khi sử dụng các tính năng khác, bạn có thể cung cấp thông tin hồ sơ, bài đăng phòng,
          tin nhắn, nội dung giao dịch và vị trí khi chủ động cấp quyền.
        </p>
      </section>

      <section>
        <h2>Mục đích sử dụng</h2>
        <p>Homeji đo số lượt xem trang và phiên ghé website bằng mã ngẫu nhiên lưu trong phiên trình duyệt. Thống kê chỉ gửi nhóm trang và thời điểm đến máy chủ Homeji, không gửi email, IP, nội dung tìm kiếm hoặc mã tin phòng vào dữ liệu thống kê. Phiên mới bắt đầu sau 30 phút không chuyển trang. Homeji tôn trọng tín hiệu Do Not Track và Global Privacy Control của trình duyệt.</p>
        <p>
          Dữ liệu được dùng để xác thực tài khoản, duy trì phiên đăng nhập, cung cấp tính năng
          tìm phòng và kết nối người dùng, phòng chống gian lận, xử lý yêu cầu hỗ trợ và cải thiện
          độ an toàn của dịch vụ.
        </p>
      </section>

      <section>
        <h2>Lưu trữ và chia sẻ</h2>
        <p>
          Homeji sử dụng Google cho bước xác minh danh tính và Supabase cho dịch vụ xác thực.
          Dữ liệu chỉ được chia sẻ với nhà cung cấp hạ tầng cần thiết để vận hành dịch vụ, hoặc
          khi pháp luật yêu cầu. Homeji không bán thông tin đăng nhập Google của bạn.
        </p>
      </section>

      <section>
        <h2>Quyền của bạn</h2>
        <p>
          Bạn có thể đăng xuất bất kỳ lúc nào, thu hồi quyền truy cập của Homeji trong trang bảo
          mật Tài khoản Google và yêu cầu chỉnh sửa hoặc xóa dữ liệu tài khoản theo kênh hỗ trợ
          được hiển thị trên màn hình đồng ý đăng nhập.
        </p>
      </section>

      <section>
        <h2>Bảo mật và thay đổi chính sách</h2>
        <p>
          Homeji áp dụng các biện pháp kỹ thuật hợp lý để bảo vệ dữ liệu. Chính sách có thể được
          cập nhật khi dịch vụ hoặc yêu cầu pháp lý thay đổi; ngày cập nhật mới nhất luôn được
          hiển thị ở đầu trang.
        </p>
      </section>
    </LegalLayout>
  )
}

export function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Điều khoản sử dụng"
      intro="Bằng việc sử dụng Homeji, bạn đồng ý tuân thủ các điều khoản dưới đây."
    >
      <section>
        <h2>Tài khoản</h2>
        <p>
          Bạn chịu trách nhiệm cung cấp thông tin chính xác, bảo vệ quyền truy cập tài khoản và
          thông báo khi phát hiện hoạt động trái phép. Bạn không được giả mạo người khác hoặc sử
          dụng dịch vụ cho mục đích bất hợp pháp.
        </p>
      </section>

      <section>
        <h2>Nội dung và giao dịch</h2>
        <p>
          Người dùng chịu trách nhiệm về bài đăng, tin nhắn và thông tin giao dịch của mình. Nội
          dung lừa đảo, xâm phạm quyền của người khác, gây hại hoặc vi phạm pháp luật có thể bị
          gỡ bỏ và tài khoản liên quan có thể bị hạn chế.
        </p>
      </section>

      <section>
        <h2>Vai trò của Homeji</h2>
        <p>
          Homeji cung cấp nền tảng hỗ trợ tìm phòng và kết nối người dùng. Trừ khi được nêu rõ,
          Homeji không phải là bên cho thuê, người mua, người bán hoặc bên bảo đảm cho giao dịch
          giữa người dùng.
        </p>
      </section>

      <section>
        <h2>Tạm ngừng và chấm dứt</h2>
        <p>
          Homeji có thể tạm ngừng hoặc chấm dứt quyền truy cập khi cần bảo vệ người dùng, hệ
          thống hoặc tuân thủ pháp luật. Bạn có thể ngừng sử dụng dịch vụ và thu hồi quyền đăng
          nhập Google bất kỳ lúc nào.
        </p>
      </section>

      <section>
        <h2>Thay đổi điều khoản</h2>
        <p>
          Điều khoản có thể được cập nhật để phản ánh thay đổi của dịch vụ. Việc tiếp tục sử dụng
          Homeji sau khi điều khoản mới có hiệu lực đồng nghĩa với việc bạn chấp nhận bản cập nhật.
        </p>
      </section>
    </LegalLayout>
  )
}
