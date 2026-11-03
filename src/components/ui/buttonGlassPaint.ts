import { GLASS_CONTENT_CONTROLS } from './glassControlScope'
import type { ButtonGlassPaint } from './buttonGlassRenderer'

export const BUTTON_GLASS_CANDIDATES = 'button,a.btn,a.liquid-action,a[class*="__cta"],a[class*="__btn"],a[class*="__action"]'
const exclusions = '.gm-style,gmp-map,[data-glass-webgl],[data-glass-exclude],.ai-spectrum-button,.theme-switch,.liquid-switch,.food-qty,.food-cart-fab,.food-cart-sheet'

export function supportsButtonGlass(element: HTMLElement) {
  return element.matches(BUTTON_GLASS_CANDIDATES) && !element.closest(exclusions)
    && !element.matches(`${GLASS_CONTENT_CONTROLS},:disabled,[aria-disabled="true"],[hidden]`)
    && !element.querySelector('h1,h2,h3,h4,p,article,section,table,img,canvas:not(.button-glass__surface)')
    && (element.textContent?.trim().length ?? 0) <= 120
}

const mix = (front: number[], back: number[]) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3]))
const luminance = (rgb: number[]) => rgb.slice(0, 3).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
export const glassContrast = (a: number[], b: number[]) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
export const cssColor = (rgb: number[]) => `rgb(${rgb.slice(0, 3).map(v => Math.round(v * 255)).join(' ')})`


export function chooseGlassInk(declared: number[], face: number[]) {
  if (glassContrast(declared, face) >= 4.6) return declared
  const candidates = [[.075, .16, .2], [.95, .98, 1], [0, 0, 0], [1, 1, 1]]
  const branded = candidates.slice(0, 2).sort((a, b) => glassContrast(b, face) - glassContrast(a, face))
  if (glassContrast(branded[0], face) >= 4.6) return branded[0]
  return candidates.sort((a, b) => glassContrast(b, face) - glassContrast(a, face))[0]
}

/** Parse browser-resolved Color 4 values through its native color parser. */
export function createButtonPaintReader() {
  const probe = document.createElement('canvas'); probe.width = probe.height = 1
  const ctx = probe.getContext('2d', { willReadFrequently: true })
  const colors = new Map<string, number[]>()
  const color = (value: string) => {
    const saved = colors.get(value)
    if (saved) return saved
    if (!ctx || !value.trim()) return [0, 0, 0, 0]
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1)
    const parsed = [...ctx.getImageData(0, 0, 1, 1).data].map(v => v / 255)
    if (colors.size > 256) colors.clear()
    colors.set(value, parsed); return parsed
  }
  return (element: HTMLElement): { paint: ButtonGlassPaint; ink: number[] } | null => {
    const style = getComputedStyle(element)
    // Alpha-composite known ancestor paint. Photographs/video/canvas and
    // gradients are deliberately unsupported rather than guessed as white.
    const own = color(style.backgroundColor)
    const layers: number[][] = []
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const parentStyle = getComputedStyle(parent)
      const background = color(parentStyle.backgroundColor)
      if (parentStyle.backgroundImage !== 'none' || parent.matches('video,canvas')) { if (own[3] >= .99) { layers.push(own); break } return null }
      layers.push(background)
      if (background[3] >= .99) break
    }
    const dark = document.documentElement.dataset.theme === 'dark'
    let scene = dark ? [0.075, .13, .17] : [.97, .985, .99]
    for (const layer of layers.reverse()) scene = mix(layer, scene)
    // Color-bearing fills keep their authored intent. Neutral controls take
    // their local paper color, never an opaque black dark-theme default.
    const matchesDefault = ['--glass-tint', '--control-glass-fill'].some(name => {
      const defaultFill = color(style.getPropertyValue(name))
      return defaultFill[3] > 0 && own.every((value, index) => Math.abs(value - defaultFill[index]) < .015)
    })
    const face = matchesDefault ? scene : mix(own, scene)
    const declaredInk = color(style.color)
    const effectiveInk = mix(declaredInk, face)
    const ink = chooseGlassInk(effectiveInk, face)
    const radius = Math.min(parseFloat(style.borderTopLeftRadius) || 0, element.clientHeight / 2, element.clientWidth / 2)
    return { paint: { face, scene, radius, dark: luminance(scene) < .3 }, ink }
  }
}
