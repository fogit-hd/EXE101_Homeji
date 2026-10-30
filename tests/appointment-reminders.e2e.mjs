import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_UI_BASE ?? 'http://127.0.0.1:5187'
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Local fixtures only')
const out = 'output/verification/appointment-reminders'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `import React from 'react';import{createRoot}from'react-dom/client';import{MapAppointmentsPanel}from'/src/components/map/MapAppointmentsPanel.tsx';import'/src/index.css';createRoot(document.getElementById('root')).render(<MapAppointmentsPanel/>);`)
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
let user = 'renter'
await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `export const useAuth=()=>({profile:{id:${JSON.stringify(user)},displayName:'Kiểm thử'}})` }))
await context.addInitScript(() => { localStorage.setItem('homeji_access_token', 'fixture'); localStorage.setItem('homeji_user_id', 'renter') })
let appointment = { id: 'appointment', rentalPostId: 'room', rentalPostTitle: 'Phòng kiểm thử lời nhắc', requesterId: 'renter', ownerId: 'owner', status: 1, scheduledAt: new Date(Date.now() + 3 * 86400_000).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), reminderMinutesBefore: null }
const requests = []
let failNext = false
await context.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/')) return route.continue()
  if (path === '/api/viewing-appointments') return route.fulfill({ json: [appointment] })
  if (path === '/api/viewing-appointments/appointment/reminder') {
    assert.equal(route.request().method(), 'PUT')
    const { minutesBefore } = route.request().postDataJSON()
    requests.push(minutesBefore)
    if (failNext) { failNext = false; return route.fulfill({ status: 400, json: { detail: 'Vui lòng xác thực email tài khoản.' } }) }
    appointment = { ...appointment, reminderMinutesBefore: minutesBefore, reminderDueAt: minutesBefore == null ? null : new Date(Date.parse(appointment.scheduledAt) - minutesBefore * 60000).toISOString() }
    return route.fulfill({ json: appointment })
  }
  return route.fulfill({ json: [] })
})
const page = await context.newPage()
page.setDefaultTimeout(8000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
const open = async () => { await page.goto(`${base}/${out}/index.html`); await page.getByRole('button', { name: 'Danh sách', exact: true }).click() }
try {
  await open()
  await page.getByRole('button', { name: 'Đặt lời nhắc qua email' }).click()
  await page.getByLabel('Gửi email nhắc trước').selectOption('60')
  await page.getByRole('button', { name: 'Lưu lời nhắc' }).click()
  await page.getByText('Nhắc qua email trước 1 giờ.', { exact: true }).waitFor()
  await open()
  await page.getByText('Nhắc qua email trước 1 giờ.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Đổi lời nhắc email' }).click()
  await page.getByLabel('Gửi email nhắc trước').selectOption('15')
  await page.getByRole('button', { name: 'Lưu lời nhắc' }).click()
  await page.getByText('Nhắc qua email trước 15 phút.', { exact: true }).waitFor()
  await page.screenshot({ path: `${out}/desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Hủy lời nhắc', exact: true }).click()
  await page.getByRole('button', { name: 'Đặt lời nhắc qua email' }).waitFor()
  await page.getByRole('button', { name: 'Đặt lời nhắc qua email' }).click()
  failNext = true
  await page.getByRole('button', { name: 'Lưu lời nhắc' }).click()
  await page.getByRole('alert').filter({ hasText: 'xác thực email' }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${out}/mobile.png`, fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  assert.equal(overflow, false)
  user = 'owner'
  await open()
  assert.equal(await page.getByRole('button', { name: 'Đặt lời nhắc qua email' }).count(), 0)
  assert.deepEqual(requests, [60, 15, null, 15])
  assert.deepEqual(errors, [])
  await writeFile(`${out}/results.json`, JSON.stringify({ passed: true, checks: ['set', 'persist after reload', 'change', 'cancel', 'API error', 'mobile', 'owner hidden'], requests }, null, 2))
  console.log('PASS reminder UI: set, reload, change, cancel, error, mobile and requester-only controls')
 } catch (error) {
  console.error('Browser errors:', errors)
  console.error('Page:', (await page.locator('body').innerText()).slice(0, 1500))
  await page.screenshot({ path: out + '/failure.png', fullPage: true })
  throw error
} finally { await browser.close() }
