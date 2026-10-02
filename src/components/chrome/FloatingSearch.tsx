import type { FormEvent, ReactNode } from 'react'
import './FloatingSearch.css'

type Props = {
  /** Filter field slots (inputs / selects). */
  children: ReactNode
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  submitLabel?: string
  className?: string
  /** Disable the search button. */
  disabled?: boolean
}

export function FloatingSearch({
  children,
  onSubmit,
  submitLabel = 'Tìm kiếm',
  className = '',
  disabled = false,
}: Props) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.(event)
  }

  return (
    <form
      className={`floating-search ${className}`.trim()}
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="floating-search__fields">{children}</div>
      <button
        type="submit"
        className="floating-search__submit"
        disabled={disabled}
      >
        {submitLabel}
      </button>
    </form>
  )
}
