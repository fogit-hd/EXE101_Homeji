import lensMap from './liquid-lens-map.png'

/** Static lens normals; the real backdrop supplies all colors, never the map. */
export function LiquidGlassEffects() {
  return <svg className="liquid-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <filter id="homeji-liquid-lens" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox"
        x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feImage href={lensMap} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="lens" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.005 0.018" result="scene" />
        <feDisplacementMap in="scene" in2="lens" scale="0.18" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
}
