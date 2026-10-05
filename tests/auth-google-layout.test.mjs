import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('auth grid can shrink after the asynchronous Google button is rendered', () => {
  const css = readFileSync(new URL('../src/ui-consistency.css', import.meta.url), 'utf8')
  const stage = css.match(/\.auth-cinema__stage\s*\{([^}]+)\}/)[1]
  assert.ok(/grid-template-columns:\s*minmax\(0, 1fr\);/.test(stage))
  assert.ok(/\.auth-cinema__form-wrap\s*\{[^}]*min-width:\s*0;/.test(css))
})

test('mobile auth keeps the chatbot launcher without an unsolicited bubble over the form', () => {
  const css = readFileSync(new URL('../src/ui-consistency.css', import.meta.url), 'utf8')
  assert.match(css, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?body:has\(\.auth-cinema\)\s+\.map-chatbot__welcome\s*\{\s*display:\s*none;/)
  assert.match(css, /\.auth-cinema\s*\{[^}]*padding:\s*28px 16px 100px;/)
  assert.doesNotMatch(css, /body:has\(\.auth-cinema\)\s+\.map-chatbot(?:__fab)?\s*\{[^}]*display:\s*none;/)
})
