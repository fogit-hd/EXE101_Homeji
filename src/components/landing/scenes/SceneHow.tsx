import { LandingSceneShell } from './LandingSceneShell'
import { buildHowTimeline } from './sceneTimelines'

const STEPS = [
  'Chọn khu vực trên bản đồ',
  'Lọc phòng / ở ghép phù hợp',
  'Xem chi tiết, nhắn tin hoặc hẹn xem',
]

export function SceneHow() {
  return (
    <LandingSceneShell
      id="how"
      eyebrow="Cách hoạt động"
      title="Ba bước tới chỗ ở mới"
      lead="Scrub từng bước — tua ngược khi cuộn lên."
      buildTimeline={buildHowTimeline}
    >
      <ol className="hl-scene__steps">
        {STEPS.map((label, index) => (
          <li key={label} data-scrub-step>
            <span className="hl-scene__step-index">{index + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </LandingSceneShell>
  )
}
