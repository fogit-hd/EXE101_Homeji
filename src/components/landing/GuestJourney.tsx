import './GuestJourney.css'

const steps = [
  { tone: 'area', title: 'Khoanh vùng nơi muốn ở', description: 'Chọn khu vực gần trường và khoảng ngân sách phù hợp với bạn.', detail: 'Khu vực · Ngân sách', pattern: [
    '..o..', '.#o##', '#o###', 'oo##.', '.·#oo', '..·..',
  ] },
  { tone: 'compare', title: 'So sánh trước khi chọn', description: 'Xem ảnh, giá thuê và vị trí. Lưu các phòng bạn muốn tìm hiểu thêm.', detail: 'Thông tin · Danh sách đã lưu', pattern: [
    '##...', '##o..', '.oo#.', '·.###', '.·.#o', '...oo',
  ] },
  { tone: 'contact', title: 'Trao đổi rồi quyết định', description: 'Nhắn người đăng, hẹn xem phòng hoặc kết nối bạn cùng phòng qua lời mời.', detail: 'Nhắn tin · Lịch xem phòng', pattern: [
    '..#..', '..o..', '#oo##', 'oo#··', '..#..', '..·..',
  ] },
] as const

function JourneyPattern({ rows }: { rows: readonly string[] }) {
  return (
    <svg className="guest-journey__pattern" viewBox="0 0 100 116" aria-hidden="true" focusable="false">
      {rows.flatMap((row, y) => Array.from(row, (dot, x) => dot === '.' ? null : (
        <circle key={`${x}-${y}`} cx={9 + x * 18} cy={9 + y * 18} r={dot === '·' ? 6 : 7.6}
          data-dot={dot === '#' ? 'solid' : dot === 'o' ? 'ring' : 'faint'} />
      )))}
    </svg>
  )
}

export function GuestJourney() {
  return <div className="guest-journey" data-glass-exclude>
    <section id="how" className="guest-journey__section" aria-labelledby="journey-title">
      <header className="guest-journey__heading"><h2 id="journey-title">Cách dùng Homeji</h2>
      </header>
      <ol className="guest-journey__steps" role="list">{steps.map(({ tone, title, description, detail, pattern }) => <li key={tone} data-tone={tone}>
        <JourneyPattern rows={pattern} />
        <div className="guest-journey__copy">
          <h3>{title}</h3><p>{description}</p><span className="guest-journey__detail">{detail}</span>
        </div>
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
