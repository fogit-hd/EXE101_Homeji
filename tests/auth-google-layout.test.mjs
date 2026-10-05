import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('auth grid can shrink after the asynchronous Google button is rendered', () => {
  const css = readFileSync(new URL('../src/ui-consistency.css', import.meta.url), 'utf8')
  const stage = css.match(/\.auth-cinema__stage\s*\{([^}]+)\}/)[1]
  assert.ok(/grid-template-columns:\s*minmax\(0, 1fr\);/.test(stage))
  assert.ok(/\.auth-cinema__form-wrap\s*\{[^}]*min-width:\s*0;/.test(css))
})
