import './GuestJourney.css'

const steps = [
  ['01', 'Khoanh vùng nơi muốn ở', 'Chọn khu vực gần trường và khoảng ngân sách phù hợp với bạn.', 'Khu vực · Ngân sách'],
  ['02', 'So sánh trước khi chọn', 'Xem ảnh, giá thuê và vị trí. Lưu các phòng bạn muốn tìm hiểu thêm.', 'Thông tin · Danh sách đã lưu'],
  ['03', 'Trao đổi rồi quyết định', 'Nhắn người đăng, hẹn xem phòng hoặc kết nối bạn cùng phòng qua lời mời.', 'Nhắn tin · Lịch xem phòng'],
]
const roles = [
  ['Tìm chỗ ở', 'Sinh viên tìm phòng', 'Bắt đầu từ khu vực, giá thuê và tiện ích. Giữ những lựa chọn phù hợp trong một danh sách.'],
  ['Chia sẻ không gian', 'Tìm bạn cùng phòng', 'Trao đổi nhu cầu ở chung, gửi lời mời và theo dõi phản hồi trước khi chuyển vào.'],
  ['Đăng phòng', 'Chủ nhà cho thuê', 'Cung cấp ảnh, giá và các khoản phí rõ ràng để người thuê dễ tìm hiểu và liên hệ.'],
]

export function GuestJourney() {
  return <div className="guest-journey" data-glass-exclude>
    <section id="how" className="guest-journey__section" aria-labelledby="journey-title">
      <header className="guest-journey__heading"><p className="guest-journey__eyebrow">TỪ TÌM KIẾM ĐẾN KẾT NỐI</p>
        <h2 id="journey-title">Chỗ ở phù hợp,<br />bắt đầu từ ba bước.</h2>
        <p>Mỗi bước đều rõ ràng, để bạn dành thời gian cho những lựa chọn đáng cân nhắc.</p>
      </header>
      <ol className="guest-journey__steps">{steps.map(([number, title, description, detail]) => <li key={number}>
        <span className="guest-journey__number" aria-hidden="true">{number}</span>
        <h3>{title}</h3><p>{description}</p><span className="guest-journey__detail">{detail}</span>
      </li>)}</ol>
    </section>
    <section id="for" className="guest-journey__section guest-journey__audience" aria-labelledby="journey-audience">
      <header className="guest-journey__heading"><p className="guest-journey__eyebrow">BẠN ĐANG CẦN GÌ?</p>
        <h2 id="journey-audience">Một nơi kết nối.<br />Ba nhu cầu khác nhau.</h2>
      </header>
      <div className="guest-journey__roles">{roles.map(([label, title, description], index) => <article key={label}>
        <span className="guest-journey__role-index" aria-hidden="true">0{index + 1}</span>
        <div><p className="guest-journey__eyebrow">{label}</p><h3>{title}</h3><p>{description}</p></div>
      </article>)}</div>
    </section>
    <section id="start" className="guest-journey__section guest-journey__trust" aria-labelledby="journey-trust">
      <header className="guest-journey__heading"><p className="guest-journey__eyebrow">TRƯỚC KHI BẠN QUYẾT ĐỊNH</p>
        <h2 id="journey-trust">Thông tin rõ.<br />Kết nối chủ động.</h2>
        <p>Homeji giúp bạn tìm hiểu nơi ở quanh Thủ Đức và Quận 9. Hãy xác nhận tình trạng phòng và các khoản phí trực tiếp với người đăng.</p>
      </header>
      <ul className="guest-journey__promises">
        <li><span aria-hidden="true">✓</span><div><h3>Khám phá miễn phí</h3><p>Tạo tài khoản và xem tin trước khi chọn bước tiếp theo.</p></div></li>
        <li><span aria-hidden="true">✓</span><div><h3>Ưu tiên khu vực gần trường</h3><p>Đối chiếu vị trí, giá và tiện ích với nhu cầu đi học của bạn.</p></div></li>
        <li><span aria-hidden="true">✓</span><div><h3>Theo dõi kết nối</h3><p>Lời mời, tin nhắn và thông báo giúp bạn nắm được tiến độ.</p></div></li>
      </ul>
    </section>
  </div>
}
