import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../src/pages/AdminModerationPage.tsx', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')

test('admin reports display people and reported content instead of raw identifiers', () => {
  assert.match(types, /reporterDisplayName: string/)
  assert.match(types, /targetDisplayName: string/)
  assert.match(types, /targetImagePath: string \| null/)
  assert.match(page, /admin-tab-badge/)
  assert.match(page, /Người gửi báo cáo:/)
  assert.match(page, /Mở nội dung bị báo cáo/)
  assert.doesNotMatch(page, /\{r\.targetId\}/)
  assert.doesNotMatch(page, /\{r\.reporterId\}/)
})

test('admin report actions use clear decisions and keep a note per report', () => {
  assert.match(page, /Xác nhận vi phạm/)
  assert.match(page, /Không vi phạm/)
  assert.match(page, /reportResolutionNotes\[r\.id\]/)
  assert.match(page, /\[A-Z\]\[A-Z0-9_:-\]/)
})
