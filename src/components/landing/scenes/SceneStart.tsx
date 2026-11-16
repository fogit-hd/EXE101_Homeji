import { Link } from 'react-router-dom'
import { LandingSceneShell } from './LandingSceneShell'
import { buildStartTimeline } from './sceneTimelines'

export function SceneStart() {
  return (
    <LandingSceneShell
      id="start"
      eyebrow="Bắt đầu"
      title="Sẵn sàng tìm trọ an tâm?"
      lead="Tạo tài khoản để lưu tin, nhắn chủ nhà và mở home map."
      buildTimeline={buildStartTimeline}
    >
      <div className="hl-scene__cta" data-scrub="cta">
        <Link className="btn btn-primary" to="/register">Đăng ký</Link>
        <Link className="btn btn-secondary" to="/login">Đăng nhập</Link>
      </div>
    </LandingSceneShell>
  )
}
