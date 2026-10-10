import { readFileSync } from 'node:fs'

const base = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8').split(':root {')[1].split('}')[0]
const tokens = Object.fromEntries([...base.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2]]))

export function colorValue(value) {
  let resolved = value.trim()
  for (let i = 0; i < 10 && resolved.includes('var('); i++) {
    resolved = resolved.replace(/var\((--[\w-]+)\)/g, (_, name) => {
      if (!(name in tokens)) throw new Error(`Unknown color token ${name}`)
      return tokens[name]
    })
  }
  const hex = resolved.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (hex) return (hex.length === 3 ? [...hex].map(c => c + c).join('') : hex).match(/../g).map(c => parseInt(c, 16))
  const mix = resolved.match(/^color-mix\(in srgb,\s*(#[\da-f]+)\s+(\d+)%,\s*(#[\da-f]+)\)$/i)
  if (mix) {
    const left = colorValue(mix[1]), right = colorValue(mix[3]), weight = Number(mix[2]) / 100
    return left.map((channel, index) => channel * weight + right[index] * (1 - weight))
  }
  const rgba = resolved.match(/^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)$/)
  if (rgba) return rgba.slice(1, 4).map(channel => Number(channel) * Number(rgba[4]) + 255 * (1 - Number(rgba[4])))
  throw new Error(`Unsupported test color ${resolved}`)
}

export function declaration(css, selector, property) {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`Missing selector ${selector}`)
  const rule = css.slice(start).split('}')[0]
  const value = rule.match(new RegExp(`(?:^|[;{])\\s*${property}:\\s*([^;]+);`))?.[1]
  if (!value) throw new Error(`Missing ${property} for ${selector}`)
  return value
}

export function contrastColors(foreground, background) {
  const luminance = color => colorValue(color).map(c => c / 255)
    .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0)
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}
