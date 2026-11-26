import { readFileSync } from 'node:fs'

// Reads the light (:root) and dark (html[data-theme='dark']) token blocks of src/index.css
// so palette tests can check real token pairs in both themes instead of hard-coded hex.
const source = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8')
const blockAt = start => {
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i)
  }
  return ''
}
const declarations = text => Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))
const themes = {
  light: declarations(blockAt(source.indexOf(':root {'))),
  dark: declarations(blockAt(source.indexOf("html[data-theme='dark'] {"))),
}

/** Resolves a token (or `var(--x)` expression) to a #rrggbb hex in a theme; null when it is not a solid colour. */
export const token = (name, theme = 'light') => {
  let value = name.startsWith('var(') || name.startsWith('#') ? name : `var(${name.startsWith('--') ? name : `--${name}`})`
  for (let guard = 0; guard < 10; guard++) {
    const ref = value.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/)
    if (!ref) break
    value = themes[theme][ref[1]] ?? themes.light[ref[1]] ?? ref[2] ?? ''
  }
  if (/^#[\da-f]{3}$/i.test(value)) value = '#' + [...value.slice(1)].map(c => c + c).join('')
  return /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : null
}

const channels = hex => hex.replace('#', '').match(/../g).map(v => parseInt(v, 16))
const luminance = hex => channels(hex)
  .map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)

/** WCAG contrast of two #rrggbb colours. */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** sRGB color-mix(in srgb, a pct%, b). */
export const mix = (a, pct, b) => '#' + channels(a).map((v, i) => Math.round(v * pct + channels(b)[i] * (1 - pct)).toString(16).padStart(2, '0')).join('')

/** Contrast of two tokens in one theme. */
export const tokenContrast = (fg, bg, theme) => contrast(token(fg, theme), token(bg, theme))

export const THEMES = ['light', 'dark']
