import { Link, useLocation } from 'react-router-dom'
import { profileSetupUrl } from '../../lib/profileSetup'
import './ProfileSetupNotice.css'

export function ProfileSetupNotice() {
  const location = useLocation()
  return <aside className="profile-setup-notice" role="status" data-glass-exclude>
    <div><strong>Lưu thông tin tài khoản để tiếp tục</strong>
      <p>Bạn cần lưu tên trong Thông tin cơ bản trước khi nạp tiền, thanh toán hoặc dùng các tính năng cần hồ sơ. Thông tin lối sống dùng cho việc tìm người ở ghép, không bắt buộc để thanh toán.</p>
    </div>
    <Link className="btn btn-primary" to={profileSetupUrl(location.pathname + location.search + location.hash)}>Bổ sung thông tin tài khoản</Link>
  </aside>
}
