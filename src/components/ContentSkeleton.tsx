import './ContentSkeleton.css'

type ContentSkeletonVariant = 'list' | 'detail'

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
      {variant === 'detail' ? (
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
