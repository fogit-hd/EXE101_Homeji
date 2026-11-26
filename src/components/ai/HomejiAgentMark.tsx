import './HomejiAgentMark.css'
/** Homeji assistant mark: line-drawn cat head that follows the text colour in both themes. */
export function HomejiAgentMark() {
  return (
    <svg
      className="homeji-agent-mark"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden="true"
      focusable="false"
      style={{ fill: 'none' }}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.2 10 4.6 4.2l4.6 2.7a10 10 0 0 1 5.6 0l4.6-2.7-.6 5.8c.6 1.1.9 2.3.9 3.5 0 4-3.6 6.6-7.7 6.6s-7.7-2.6-7.7-6.6c0-1.2.3-2.4.9-3.5Z" />
      <circle cx="9.3" cy="13" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="13" r="1.15" fill="currentColor" stroke="none" />
      <path d="m11 15.7 1 .7 1-.7" />
    </svg>
  )
}
