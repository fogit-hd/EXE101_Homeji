import './PremiumStars.css'

export function PremiumStars() {
  return <span className="premium-stars" aria-hidden="true">{[0, 1, 2].map(star =>
    <span className="premium-stars__star" key={star}>{[0, 1, 2, 3].map(frame => <i className="premium-stars__frame" key={frame} />)}</span>,
  )}</span>
}
