import './HomeListingSkeleton.css'

export function HomeListingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="home-listing-skeleton" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="home-listing-skeleton__card">
          <div className="home-listing-skeleton__image shimmer" />
          <div className="home-listing-skeleton__body">
            <div className="home-listing-skeleton__line home-listing-skeleton__line--sm shimmer" />
            <div className="home-listing-skeleton__line home-listing-skeleton__line--title shimmer" />
            <div className="home-listing-skeleton__line home-listing-skeleton__line--price shimmer" />
            <div className="home-listing-skeleton__line home-listing-skeleton__line--addr shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}
