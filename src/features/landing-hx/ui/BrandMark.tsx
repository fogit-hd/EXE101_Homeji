/**
 * The Homeji logo (public/brand/homeji-logo2.png: an "h" under a roof) as one vector path, so it can
 * take the theme's colour and be drawn stroke by stroke in the intro. Same 1256×1264 canvas as the PNG.
 */
export const BRAND_MARK_VIEWBOX = '0 0 1256 1264'
export const BRAND_MARK_PATH =
  'M184 396 L186 1048 L314 1046 L315 789 C315 735 352 693 410 693 C468 693 498 735 499 789 ' +
  'L501 1049 L1071 1046 L1072 400 L629 114 L394 263 L396 419 L630 274 L937 471 L935 915 ' +
  'L631 915 L627 712 C618 640 565 578 460 575 C405 574 350 590 314 623 L314 315 Z'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={BRAND_MARK_VIEWBOX} aria-hidden="true" focusable="false">
      <path d={BRAND_MARK_PATH} fill="currentColor" />
    </svg>
  )
}
