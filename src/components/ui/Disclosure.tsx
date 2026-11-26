import { useState, type ReactNode } from 'react'
import './Disclosure.css'

/**
 * Shared expand/collapse patterns.
 * Level 1 (Disclosure): a collapsible section, title + one-line status summary + chevron,
 * content opens right below. Native <details>, so keyboard and screen readers work as-is;
 * the open state is remembered per tab in sessionStorage when `storageKey` is given.
 * Level 2 (ShowMore): the one "Xem thêm" button at the end of a long list.
 * Level 3 (secondary tasks) lives in the dialog bottom-sheet rules in ui-consistency.css.
 */
const STORAGE_PREFIX = 'hj-disclosure:'

function readStored(key: string | undefined, fallback: boolean) {
  if (!key) return fallback
  try {
    const value = sessionStorage.getItem(STORAGE_PREFIX + key)
    return value === null ? fallback : value === '1'
  } catch { return fallback }
}

function writeStored(key: string | undefined, open: boolean) {
  if (!key) return
  try { sessionStorage.setItem(STORAGE_PREFIX + key, open ? '1' : '0') } catch { /* private mode: keep it in memory only */ }
}

type DisclosureProps = {
  title: ReactNode
  /** One short line under the title that says what is inside, e.g. "3 khoản cần hỏi". */
  summary?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  /** When set, the open state survives navigation within this tab. */
  storageKey?: string
  className?: string
  id?: string
}

export function Disclosure({ title, summary, children, defaultOpen = false, storageKey, className, id }: DisclosureProps) {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen))
  return <details id={id} className={`hj-disclosure${className ? ` ${className}` : ''}`} data-glass-exclude open={open}
    onToggle={event => { const next = event.currentTarget.open; setOpen(next); writeStored(storageKey, next) }}>
    <summary>
      <span className="hj-disclosure__label"><strong>{title}</strong>{summary ? <small>{summary}</small> : null}</span>
      <span className="hj-disclosure__chevron" aria-hidden="true" />
    </summary>
    <div className="hj-disclosure__body">{children}</div>
  </details>
}

type ShowMoreProps = {
  shown: number
  total: number
  onMore: () => void
  step?: number
  /** Noun for the counter, e.g. "tin" or "hoạt động". */
  unit?: string
  className?: string
}

export const SHOW_MORE_STEP = 15

export function ShowMore({ shown, total, onMore, step = SHOW_MORE_STEP, unit, className }: ShowMoreProps) {
  if (shown >= total) return null
  const next = Math.min(step, total - shown)
  return <button type="button" className={`hj-show-more${className ? ` ${className}` : ''}`} data-glass-exclude onClick={onMore}>
    <span>Xem thêm {next}{unit ? ` ${unit}` : ''}</span>
    <small>{shown}/{total}</small>
  </button>
}
