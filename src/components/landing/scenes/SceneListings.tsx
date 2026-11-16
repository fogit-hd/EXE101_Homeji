import { LandingSceneShell } from './LandingSceneShell'
import { buildListingsTimeline } from './sceneTimelines'

const PLACEHOLDER_CARDS = [
  { title: 'Studio gần FPT', meta: 'Thủ Đức · từ 3,5tr' },
  { title: 'Phòng ghép Q.9', meta: '2 người · có máy lạnh' },
  { title: 'Pass giường tầng', meta: 'Gần metro · linh hoạt' },
]

export function SceneListings() {
  return (
    <LandingSceneShell
      id="listings"
      eyebrow="Danh sách phòng"
      title="Phòng đang mở gần bạn"
      lead="Cuộn để xem nhịp listing — nội dung thật sẽ gắn API sau."
      buildTimeline={buildListingsTimeline}
    >
      <ul className="hl-scene__cards">
        {PLACEHOLDER_CARDS.map(card => (
          <li key={card.title} className="hl-scene__card" data-scrub-card>
            <strong>{card.title}</strong>
            <span>{card.meta}</span>
          </li>
        ))}
      </ul>
    </LandingSceneShell>
  )
}
