import './ScreenPending.css'

/** Chunk loading is independent from data loading and has no artificial delay.
 *  Visually quiet: stays invisible for fast loads, then fades in a soft shimmer skeleton. */
export function ScreenPending() {
  return <div className="screen-pending" role="status" aria-live="polite">
    <span className="screen-pending__sr">Đang mở nội dung…</span>
    <div className="screen-pending__bar screen-pending__bar--lg" aria-hidden="true" />
    <div className="screen-pending__bar" aria-hidden="true" />
    <div className="screen-pending__block" aria-hidden="true" />
  </div>
}