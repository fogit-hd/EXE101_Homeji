import { Link } from 'react-router-dom'

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`site-footer${compact ? ' site-footer--compact' : ''}`}>
      <div className="site-footer__inner">
        <Link className="site-footer__brand" to="/">Homeji</Link>
        <p>Không chỉ tìm phòng — tìm nơi thuộc về.</p>
        <nav aria-label="Thông tin Homeji">
          <Link to="/privacy">Quyền riêng tư</Link>
          <Link to="/terms">Điều khoản</Link>
        </nav>
        <small>© {new Date().getFullYear()} Homeji</small>
      </div>
    </footer>
  )
}
