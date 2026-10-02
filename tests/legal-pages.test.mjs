import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const legalSource = readFileSync(new URL('../src/pages/LegalPage.tsx', import.meta.url), 'utf8')

test('public legal routes are available for OAuth branding', () => {
  assert.match(appSource, /path="\/privacy"/)
  assert.match(appSource, /path="\/terms"/)
  assert.match(legalSource, /Chính sách quyền riêng tư/)
  assert.match(legalSource, /Điều khoản sử dụng/)
  assert.match(legalSource, /Homeji không nhận mật\s+khẩu Google của bạn/)
})
