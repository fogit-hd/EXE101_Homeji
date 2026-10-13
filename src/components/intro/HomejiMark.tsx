/**
 * Vector trace of public/brand/homeji-logo2.png (same 1256×1264 canvas, so it overlays
 * the PNG 1:1 — that is what lets the intro FLIP hand off to the header logo invisibly).
 * Traced from the PNG alpha contour and checked side by side at 628px.
 */
export const HOMEJI_MARK_VIEWBOX = '0 0 1256 1264'
export const HOMEJI_MARK_PATH =
  'M184 396 L186 1048 L314 1046 L315 789 C315 735 352 693 410 693 C468 693 498 735 499 789 ' +
  'L501 1049 L1071 1046 L1072 400 L629 114 L394 263 L396 419 L630 274 L937 471 L935 915 ' +
  'L631 915 L627 712 C618 640 565 578 460 575 C405 574 350 590 314 623 L314 315 Z'
/** Ink colour sampled from the PNG, so the vector and the raster logo match on hand-off. */
export const HOMEJI_MARK_INK = '#354d2b'

export function HomejiMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={HOMEJI_MARK_VIEWBOX} role="img" aria-label="Homeji">
      <path className="hj-mark__fill" d={HOMEJI_MARK_PATH} fill={HOMEJI_MARK_INK} />
      <path className="hj-mark__stroke" d={HOMEJI_MARK_PATH} fill="none" stroke="#00a046"
        strokeWidth={30} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
