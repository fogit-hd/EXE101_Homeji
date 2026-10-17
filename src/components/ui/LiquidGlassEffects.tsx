/** One shared, local SVG lens. Foreground labels stay outside the backdrop filter. */
export function LiquidGlassEffects() {
  return <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <filter id="homeji-liquid-lens" x="-12%" y="-24%" width="124%" height="148%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.016 0.035" numOctaves="1" seed="8" result="lens" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="scene" />
        <feDisplacementMap in="scene" in2="lens" scale="9" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
}
