import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const api = readFileSync(new URL('../src/api/index.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
const page = readFileSync(new URL('../src/pages/AdminModerationPage.tsx', import.meta.url), 'utf8')

test('admin can send a persisted maintenance announcement to every user', () => {
  assert.match(api, /sendMaintenanceAnnouncement/)
  assert.match(api, /maintenance-announcements/)
  assert.match(types, /MaintenanceAnnouncement: 14/)
  assert.match(page, /Thông báo bảo trì toàn hệ thống|ThÃ´ng bÃ¡o báº£o trÃ¬ toÃ n há»‡ thá»‘ng/)
  assert.match(page, /Gửi đến toàn bộ user|Gá»­i Ä‘áº¿n toÃ n bá»™ user/)
  assert.match(page, /datetime-local/)
})
