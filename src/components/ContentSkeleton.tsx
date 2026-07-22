import './ContentSkeleton.css'

type ContentSkeletonVariant = 'list' | 'dashboard' | 'form' | 'profile' | 'detail'

type Props = {
  variant?: ContentSkeletonVariant
  count?: number
  label?: string
  compact?: boolean
}

function Block({ className = '' }: { className?: string }) {
  return <span className={`content-skeleton__block ${className}`.trim()} />
}

function ListRow() {
  return (
    <div className="content-skeleton__row">
      <Block className="content-skeleton__thumb" />
      <div className="content-skeleton__copy">
        <Block className="content-skeleton__line content-skeleton__line--short" />
        <Block className="content-skeleton__line content-skeleton__line--title" />
        <Block className="content-skeleton__line" />
      </div>
      <Block className="content-skeleton__pill" />
    </div>
  )
}

export function ContentSkeleton({
  variant = 'list',
  count = 4,
  label = 'Đang tải nội dung…',
  compact = false,
}: Props) {
  return (
    <div
      className={`content-skeleton content-skeleton--${variant}${compact ? ' is-compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      {variant === 'profile' ? (
        <>
          <div className="content-skeleton__profile-head">
            <Block className="content-skeleton__avatar" />
            <div className="content-skeleton__copy">
              <Block className="content-skeleton__line content-skeleton__line--title" />
              <Block className="content-skeleton__line content-skeleton__line--short" />
            </div>
          </div>
          <div className="content-skeleton__grid">
            {Array.from({ length: count }, (_, index) => <ListRow key={index} />)}
          </div>
        </>
      ) : variant === 'form' ? (
        <div className="content-skeleton__form">
          <Block className="content-skeleton__line content-skeleton__line--title" />
          {Array.from({ length: count }, (_, index) => (
            <Block className="content-skeleton__field" key={index} />
          ))}
          <Block className="content-skeleton__button" />
        </div>
      ) : variant === 'dashboard' ? (
        <>
          <div className="content-skeleton__metrics">
            {Array.from({ length: 3 }, (_, index) => <Block key={index} />)}
          </div>
          <div className="content-skeleton__grid">
            {Array.from({ length: count }, (_, index) => <ListRow key={index} />)}
          </div>
        </>
      ) : variant === 'detail' ? (
        <div className="content-skeleton__detail">
          <Block className="content-skeleton__hero" />
          <Block className="content-skeleton__line content-skeleton__line--title" />
          <Block className="content-skeleton__line" />
          <Block className="content-skeleton__line" />
          <Block className="content-skeleton__line content-skeleton__line--short" />
        </div>
      ) : (
        Array.from({ length: count }, (_, index) => <ListRow key={index} />)
      )}
    </div>
  )
}
