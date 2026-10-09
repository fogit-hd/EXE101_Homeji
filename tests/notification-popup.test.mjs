import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/components/shell/shell.css', import.meta.url), 'utf8')
const luminance = hex => {
  const channels = hex.match(/[\da-f]{2}/gi).map(value => {
    const channel = Number.parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
const contrast = (first, second) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

test('notification accent labels and white icons meet normal-text contrast', () => {
  for (const severity of ['critical', 'attention']) {
    const block = css.match(new RegExp(`\\.hj-notify \\.notification-item--${severity} \\{([^}]+)\\}`))[1]
    const accent = block.match(/--notification-accent:\s*(#[\da-f]{6})/i)[1]
    const soft = block.match(/--notification-soft:\s*(#[\da-f]{6})/i)[1]
    assert.ok(contrast(accent, soft) >= 4.5, `${severity} label contrast`)
    assert.ok(contrast('#ffffff', accent) >= 4.5, `${severity} icon contrast`)
  }
})

test('fixed mobile notification popup reserves gutters excluding the scrollbar', () => {
  const block = css.match(/@media \(max-width: 900px\)\s*\{\s*\.hj-notify__pop\s*\{([^}]+)\}/)[1]
  assert.match(block, /width:\s*min\(420px, calc\(100% - 24px\)\)/)
  assert.match(block, /max-width:\s*calc\(100% - 24px\)/)
  assert.doesNotMatch(block, /100vw/)
})
