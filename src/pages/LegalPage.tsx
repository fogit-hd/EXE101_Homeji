import { Link } from 'react-router-dom'
import './LegalPage.css'
import { RevealText } from '../components/motion/RevealText'

const UPDATED_AT = '19/10/2026'

function LegalLayout({
  title,
  intro,
  children,
  updatedAt = UPDATED_AT,
}: {
  title: string
  intro: string
  children: React.ReactNode
  updatedAt?: string
}) {
  return (
    <main className="legal-page">
      <article className="legal-page__card">
        <Link className="legal-page__back" to="/">
          ← Về Homeji
        </Link>
        <header>
          <p className="legal-page__eyebrow">HOMEJI</p>
          <RevealText as="h1" text={title} />
          <p className="legal-page__updated">Cập nhật lần cuối: {updatedAt}</p>
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
        <p>Khi bạn đồng ý thống kê Google Analytics 4, Homeji gửi nhóm màn hình, loại thao tác tìm/lưu/đặt lịch và giao dịch đã được máy chủ xác nhận, gồm mã giao dịch không chứa thông tin liên hệ và số tiền. Google có thể dùng cookie, thông tin trình duyệt và mạng để đo phiên truy cập và nguồn khách. Homeji không gửi email, số điện thoại, nội dung chat, câu hỏi AI, OTP, token hoặc vị trí nhập vào các sự kiện này. GA4 được tắt trước khi đồng ý và khi có tín hiệu DNT/GPC.</p>
        <p>Bạn có thể mở “Tùy chọn thống kê” để từ chối hoặc rút đồng ý. Lựa chọn được lưu trên thiết bị; rút lại ngừng sự kiện mới và xóa cookie GA mà Homeji truy cập được, không tự xóa lịch sử đã gửi. Google xử lý dữ liệu trên hạ tầng của mình; xem <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">cách Google sử dụng dữ liệu từ các trang đối tác</a>. Số liệu giao dịch được đối soát bằng hệ thống Homeji.</p>
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
      updatedAt="16/10/2026"
      intro="Điều khoản áp dụng cho việc sử dụng Homeji để tìm phòng, kết nối ở ghép và giao dịch trên nền tảng. Vui lòng đọc trước khi tạo tài khoản hoặc thanh toán."
    >
      <section>
        <h2>1. Đơn vị vận hành và phạm vi áp dụng</h2>
        <p>
          Homeji do Hộ kinh doanh Homeji vận hành. Địa chỉ liên hệ: Vinhomes Grand Park,
          S1.06, Phường Long Thạnh Mỹ. Email hỗ trợ và tiếp nhận khiếu nại:{' '}
          <a href="mailto:duongduy12314@gmail.com">duongduy12314@gmail.com</a>.
        </p>
        <p>
          Điều khoản này điều chỉnh quan hệ giữa Homeji và người sử dụng. Hợp đồng thuê phòng,
          thỏa thuận ở ghép và đơn mua hàng có các bên, nội dung và nghĩa vụ riêng; việc có tài
          khoản Homeji không thay thế việc giao kết các thỏa thuận đó.
        </p>
      </section>

      <section>
        <h2>2. Tài khoản và điều kiện sử dụng</h2>
        <p>
          Bạn cần cung cấp thông tin chính xác, bảo vệ mật khẩu và mã xác thực, đồng thời báo
          ngay qua email hỗ trợ khi phát hiện truy cập trái phép. Không giả mạo, chiếm dụng
          tài khoản hoặc dùng tài khoản của người khác khi chưa được phép.
        </p>
        <p>
          Người giao kết giao dịch phải có năng lực hành vi dân sự phù hợp. Người chưa thành
          niên cần sự đồng ý hoặc đại diện của người đại diện theo pháp luật khi pháp luật yêu
          cầu. Người sử dụng thay mặt tổ chức phải có thẩm quyền đại diện.
        </p>
      </section>

      <section>
        <h2>3. Vai trò và trách nhiệm của Homeji</h2>
        <p>
          Homeji cung cấp công cụ đăng tin, tìm kiếm, nhắn tin và hỗ trợ giao dịch. Bên cho thuê
          hoặc người bán được xác định trong từng tin đăng, đơn hàng hoặc hợp đồng. Homeji chỉ
          là bên trực tiếp cung cấp hàng hóa hoặc dịch vụ khi thông tin giao dịch nêu rõ vai trò đó.
        </p>
        <p>
          Homeji chịu trách nhiệm đối với dịch vụ do mình cung cấp và thực hiện nghĩa vụ của
          nền tảng theo pháp luật. Việc giao dịch giữa người dùng không loại trừ trách nhiệm
          tiếp nhận phản ánh, phối hợp xử lý vi phạm hoặc trách nhiệm khác của Homeji theo luật.
        </p>
      </section>

      <section>
        <h2>4. Tin đăng và nội dung của người dùng</h2>
        <p>
          Người đăng phải có quyền cho thuê, bán hoặc giới thiệu tài sản, hàng hóa; cung cấp
          đúng giá, chi phí, tình trạng, hình ảnh và điều kiện giao dịch; cập nhật khi thông tin
          thay đổi. Người bán thực phẩm chịu trách nhiệm về nguồn gốc và an toàn thực phẩm.
          Không đăng hàng cấm, thông tin lừa đảo, nội dung xâm phạm quyền sở hữu trí tuệ,
          đời tư hoặc thông tin cá nhân của người khác trái phép.
        </p>
        <p>
          Bạn giữ quyền đối với nội dung của mình và cho phép Homeji lưu trữ, hiển thị nội dung
          trong phạm vi cần thiết để cung cấp tính năng bạn sử dụng. Việc xử lý dữ liệu cá nhân
          tuân theo <Link to="/privacy">Chính sách quyền riêng tư</Link> và pháp luật áp dụng.
        </p>
      </section>

      <section>
        <h2>5. Thuê phòng và kết nối ở ghép</h2>
        <p>
          Trước khi đặt cọc hoặc ký hợp đồng, các bên cần kiểm tra danh tính, quyền cho thuê,
          tình trạng phòng và thống nhất bằng văn bản về tiền thuê, điện nước, phí dịch vụ,
          tiền cọc, thời hạn, bàn giao và điều kiện chấm dứt, hoàn cọc. Không chuyển tiền chỉ dựa
          trên tin đăng hoặc lời hứa chưa được kiểm chứng.
        </p>
        <p>
          Gợi ý tìm phòng, kết quả AI và thông tin bản đồ dùng để tham khảo; cần đối chiếu với
          thực tế và bên cung cấp. Kết quả tìm kiếm không phải cam kết về quyền sở hữu, chất
          lượng phòng hoặc khả năng thực hiện hợp đồng của người đăng.
        </p>
      </section>

      <section>
        <h2>6. Giá, phí và thanh toán</h2>
        <p>
          Giá hàng hóa, gói dịch vụ, thời hạn sử dụng, phí và tổng số tiền phải được cung cấp
          trước khi bạn xác nhận giao dịch. Đơn vị tiền tệ là đồng Việt Nam (VND), trừ khi có
          thông tin khác phù hợp pháp luật. Bạn có quyền kiểm tra và sửa thông tin trước khi
          xác nhận; không bị tính khoản phí chưa được thông báo và chấp thuận hợp lệ.
        </p>
        <p>
          Chỉ thanh toán theo hướng dẫn trong giao dịch. Giữ mã đơn và chứng từ để đối soát;
          nếu đã bị trừ tiền nhưng trạng thái chưa cập nhật, liên hệ hỗ trợ trước khi thanh
          toán lại. Số dư hiển thị trong tính năng Ví cần được đối chiếu với lịch sử giao dịch;
          tên tính năng không phải xác nhận Homeji được cấp phép cung ứng ví điện tử.
        </p>
      </section>

      <section>
        <h2>7. Hủy giao dịch, hoàn tiền và đối soát</h2>
        <p>
          Điều kiện hủy, đổi trả và hoàn tiền của từng hàng hóa hoặc gói dịch vụ phải được
          thông báo trước khi xác nhận. Quyền của người tiêu dùng theo luật vẫn được bảo đảm.
          Tiền cọc thuê phòng được xử lý theo thỏa thuận hợp pháp giữa các bên và pháp luật
          liên quan; không mặc nhiên áp dụng chính sách của đơn mua hàng cho tiền cọc thuê.
        </p>
        <p>
          Khi phát sinh thanh toán trùng, sai số tiền, không cung cấp dịch vụ hoặc tranh chấp
          hoàn tiền, gửi mã giao dịch, thời điểm, số tiền và chứng từ qua email hỗ trợ. Homeji
          đối soát và thông báo kết quả, phương thức, thời gian xử lý phù hợp với trường hợp
          cụ thể và thời hạn luật định. Không gửi mật khẩu, mã OTP hoặc đầy đủ thông tin thẻ.
        </p>
      </section>

      <section>
        <h2>8. Quyền riêng tư và an toàn dữ liệu</h2>
        <p>
          Đọc <Link to="/privacy">Chính sách quyền riêng tư</Link> để biết thông tin về dữ
          liệu được xử lý. Việc chấp thuận điều khoản không thay thế sự đồng ý riêng đối với
          xử lý dữ liệu khi pháp luật yêu cầu. Bạn có thể gửi yêu cầu thực hiện quyền đối với
          dữ liệu cá nhân qua email hỗ trợ; việc xử lý yêu cầu tuân theo pháp luật áp dụng.
        </p>
      </section>

      <section>
        <h2>9. Xử lý vi phạm và chấm dứt sử dụng</h2>
        <p>
          Homeji có thể gỡ nội dung hoặc hạn chế tài khoản khi có căn cứ về gian lận, vi phạm
          pháp luật, xâm phạm quyền của người khác hoặc gây mất an toàn hệ thống. Biện pháp
          phải phù hợp với mức độ vi phạm; lý do và cách phản hồi được thông báo, trừ trường
          hợp pháp luật không cho phép hoặc cần xử lý khẩn cấp để ngăn chặn thiệt hại.
        </p>
        <p>
          Bạn có thể ngừng sử dụng hoặc gửi yêu cầu đóng tài khoản qua email hỗ trợ. Việc đóng
          hoặc hạn chế tài khoản không tự động làm mất số dư, quyền hoàn tiền, khiếu nại hay
          các nghĩa vụ giao dịch còn tồn tại. Dữ liệu cần lưu theo luật được xử lý theo thời
          hạn và mục đích hợp pháp.
        </p>
      </section>

      <section>
        <h2>10. Khiếu nại và giải quyết tranh chấp</h2>
        <p>
          Gửi khiếu nại đến <a href="mailto:duongduy12314@gmail.com">duongduy12314@gmail.com</a>,
          kèm thông tin liên hệ, mã tin hoặc mã đơn, nội dung yêu cầu và bằng chứng liên quan.
          Homeji tiếp nhận, xác minh và phản hồi theo thời hạn pháp luật quy định; người dùng
          được thông tin về tiến độ và kết quả xử lý.
        </p>
        <p>
          Các bên có thể giải quyết bằng thương lượng, hòa giải, trọng tài khi có thỏa thuận
          hợp lệ hoặc Tòa án có thẩm quyền. Không bắt buộc người dùng từ bỏ quyền khiếu nại,
          khởi kiện hoặc liên hệ cơ quan bảo vệ người tiêu dùng. Pháp luật Việt Nam được áp
          dụng; điều khoản không hạn chế quyền bắt buộc được pháp luật bảo vệ.
        </p>
      </section>

      <section>
        <h2>11. Trách nhiệm và cập nhật điều khoản</h2>
        <p>
          Mỗi bên chịu trách nhiệm về hành vi và nghĩa vụ của mình theo pháp luật, bao gồm
          trách nhiệm bồi thường khi đủ căn cứ. Không nội dung nào tại đây miễn trừ trách
          nhiệm bắt buộc của Homeji hoặc cho phép Homeji tự quyết định người dùng có vi phạm.
        </p>
        <p>
          Khi sửa đổi, Homeji công bố nội dung và thời điểm áp dụng, đồng thời thông báo thay
          đổi ảnh hưởng đến quyền, nghĩa vụ của người dùng trước khi áp dụng. Thay đổi không
          tự động áp dụng hồi tố cho giao dịch đã giao kết; trường hợp cần sự đồng ý, Homeji
          phải có sự chấp thuận hợp lệ. Nếu một nội dung không có hiệu lực, quyền theo luật
          vẫn được bảo đảm và các nội dung còn lại áp dụng trong phạm vi hợp pháp.
        </p>
      </section>

      <section>
        <h2>12. Văn bản pháp luật tham chiếu</h2>
        <p>
          <a href="https://vanban.chinhphu.vn/?docid=208363&amp;pageid=27160">Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15</a>;{' '}
          <a href="https://chinhphu.vn/?docid=216503&amp;pageid=27160">Luật Thương mại điện tử 122/2025/QH15</a>;{' '}
          <a href="https://vanban.chinhphu.vn/?docid=214590&amp;pageid=27160">Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15</a>.
          Các quy định sửa đổi, bổ sung và văn bản hướng dẫn có liên quan được áp dụng theo
          hiệu lực pháp luật tại thời điểm giao dịch.
        </p>
      </section>
    </LegalLayout>
  )
}
