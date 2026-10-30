import './VerifiedOwnerBadge.css'

export function VerifiedOwnerBadge() {
  return <span className="verified-owner-badge" title="Hồ sơ chủ nhà đã được Homeji duyệt. Dấu này không xác nhận chất lượng phòng.">
    <span className="verified-owner-badge__icon" aria-hidden="true">
    {[0, 1, 2, 3].map(frame => <img key={frame} className="verified-owner-badge__ring" src={`/images/badges/verified-owner-ring-${frame}.png`} alt="" width="26" height="26" decoding="async" />)}
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M10 1.5 17 4v5c0 4-3 7-7 9.5C6 16 3 13 3 9V4l7-2.5Z" fill="currentColor" /><path d="m6.5 9.5 2.3 2.3 4.7-4.7" stroke="var(--verified-check, #fff)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
    Chủ nhà đã xác minh
  </span>
}
