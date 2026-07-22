import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const api = readFileSync(new URL('../src/api/index.ts', import.meta.url), 'utf8')
const auth = readFileSync(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../src/pages/AdminModerationPage.tsx', import.meta.url), 'utf8')

test('authenticated sessions do not poll a dedicated presence endpoint', () => {
  assert.doesNotMatch(api, /\/api\/activities\/presence/)
  assert.doesNotMatch(auth, /sendPresence/)
})

test('admin UI exposes users connected through realtime', () => {
  assert.match(api, /\/api\/admin\/moderation\/active-users/)
  assert.match(page, /Đang hoạt động/)
  assert.match(page, /kết nối realtime đang mở/)
  assert.doesNotMatch(page, /Hoạt động gần đây/)
})
