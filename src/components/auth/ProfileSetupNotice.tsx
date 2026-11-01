import { Link, useLocation } from 'react-router-dom'
import { profileSetupUrl } from '../../lib/profileSetup'
import { useAuth } from '../../contexts/AuthContext'
import './ProfileSetupNotice.css'

export function ProfileSetupNotice({ action, returnTo, onNavigate }: { action?: string; returnTo?: string; onNavigate?: () => void } = {}) {
  const location = useLocation()
  const { refreshProfile } = useAuth()
  return <aside className="profile-setup-notice" role="status" data-glass-exclude>
    <div><strong>{action ? `Vui lòng cập nhật hồ sơ để ${action}.` : 'Vui lòng cập nhật hồ sơ để tiếp tục.'}</strong>
      <p>Lưu tên trong mục Thông tin cơ bản để sử dụng tính năng này. Bạn có thể bổ sung các thông tin khác sau.</p>
    </div>
    <Link className="btn btn-primary" onClick={() => { void refreshProfile(); onNavigate?.() }} to={profileSetupUrl(returnTo ?? location.pathname + location.search + location.hash)}>Cập nhật hồ sơ</Link>
  </aside>
}
