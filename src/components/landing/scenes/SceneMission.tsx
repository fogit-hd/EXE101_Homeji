import { LandingSceneShell } from './LandingSceneShell'
import { buildMissionTimeline } from './sceneTimelines'

export function SceneMission() {
  return (
    <LandingSceneShell
      id="mission"
      eyebrow="Sứ mệnh"
      title="An tâm trước thẩm mỹ"
      lead="Thông tin chỗ ở rõ ràng, trạng thái tin minh bạch — để bạn thuê nhanh và tin tưởng."
      buildTimeline={buildMissionTimeline}
    >
      <div className="hl-scene__panel" data-scrub="panel">
        <p>Bản đồ là ngôi nhà. Landing kể chuyện; sau đăng nhập bạn ở lại trên map.</p>
      </div>
    </LandingSceneShell>
  )
}
