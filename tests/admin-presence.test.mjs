import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const api = readFileSync(new URL('../src/api/index.ts', import.meta.url), 'utf8')
const auth = readFileSync(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../src/pages/AdminModerationPage.tsx', import.meta.url), 'utf8')

test('authenticated sessions send a bounded presence heartbeat', () => {
  assert.match(api, /\/api\/activities\/presence/)
  assert.match(auth, /setInterval\(sendPresence, 60_000\)/)
})

test('admin UI exposes online and recently active users', () => {
  assert.match(api, /\/api\/admin\/moderation\/active-users/)
  assert.match(page, /Đang hoạt động/)
  assert.match(page, /Hoạt động gần đây/)
})
