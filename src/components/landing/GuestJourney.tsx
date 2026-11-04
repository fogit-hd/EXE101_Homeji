import './GuestJourney.css'

const steps = [
  ['01', 'Khoanh vùng nơi muốn ở', 'Chọn khu vực gần trường và khoảng ngân sách phù hợp với bạn.', 'Khu vực · Ngân sách'],
  ['02', 'So sánh trước khi chọn', 'Xem ảnh, giá thuê và vị trí. Lưu các phòng bạn muốn tìm hiểu thêm.', 'Thông tin · Danh sách đã lưu'],
  ['03', 'Trao đổi rồi quyết định', 'Nhắn người đăng, hẹn xem phòng hoặc kết nối bạn cùng phòng qua lời mời.', 'Nhắn tin · Lịch xem phòng'],
]

export function GuestJourney() {
  return <div className="guest-journey" data-glass-exclude>
    <section id="how" className="guest-journey__section" aria-labelledby="journey-title">
      <header className="guest-journey__heading"><h2 id="journey-title">Cách dùng Homeji</h2>
      </header>
      <ol className="guest-journey__steps">{steps.map(([number, title, description, detail]) => <li key={number}>
        <span className="guest-journey__number" aria-hidden="true">{number}</span>
        <h3>{title}</h3><p>{description}</p><span className="guest-journey__detail">{detail}</span>
      </li>)}</ol>
    </section>
    <section id="start" className="guest-journey__section guest-journey__trust" aria-labelledby="journey-trust">
      <header className="guest-journey__heading"><h2 id="journey-trust">Trước khi quyết định</h2>
        <p>Hãy xác nhận tình trạng phòng và các khoản phí trực tiếp với người đăng.</p>
      </header>
      <ul className="guest-journey__promises">
        <li><span aria-hidden="true">✓</span><div><h3>Xem tin miễn phí</h3><p>Tạo tài khoản khi bạn muốn lưu phòng hoặc xem số liên hệ.</p></div></li>
        <li><span aria-hidden="true">✓</span><div><h3>Ưu tiên khu vực gần trường</h3><p>Đối chiếu vị trí, giá và tiện ích với nhu cầu đi học của bạn.</p></div></li>
        <li><span aria-hidden="true">✓</span><div><h3>Theo dõi trao đổi</h3><p>Lời mời, tin nhắn và thông báo giúp bạn nắm được tiến độ.</p></div></li>
      </ul>
    </section>
  </div>
}
