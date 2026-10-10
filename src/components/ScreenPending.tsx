import './ScreenPending.css'

/** Chunk loading is independent from data loading and has no artificial delay. */
export function ScreenPending() {
  return <div className="screen-pending" role="status" aria-live="polite">
    <p>Đang mở nội dung…</p>
    <div className="screen-pending__placeholder" aria-hidden="true" />
  </div>
}
