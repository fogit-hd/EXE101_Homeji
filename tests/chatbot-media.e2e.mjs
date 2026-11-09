import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local fixtures only')
const out = 'output/verification/chatbot-media'
await mkdir(out, { recursive: true })
await writeFile(`${out}/index.html`, '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `
import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import{toggleHomejiAi}from'/src/lib/homejiAiLauncher.ts';
import'/src/index.css';import'/src/ui-consistency.css';import'/src/ai-spectrum.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/components/theme/dark-theme.css';
createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><ChatbotProvider><button data-homeji-ai-trigger="" onClick={event=>toggleHomejiAi(event.currentTarget,true)}>Mở chat kiểm thử</button></ChatbotProvider></ToastProvider></MemoryRouter>);`)

const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const results = []
try {
  for (const [width, theme] of [[390, 'light'], [1280, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, permissions: ['microphone'], reducedMotion: 'reduce' })
    await context.addInitScript(theme => {
      localStorage.setItem('homeji_access_token', 'fixture')
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.theme = theme }, { once: true })
    }, theme)
    await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1,onboardingCompleted:true}})' }))
    await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
    const requests = [], transcriptions = []
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: true, greeting: 'Dữ liệu kiểm thử local', suggestedPrompts: [], historyStorageEnabled: false } })
      if (path === '/api/chatbot/transcriptions') {
        transcriptions.push(route.request().postDataJSON())
        return route.fulfill({ json: { text: 'Tìm phòng dưới ba triệu.' } })
      }
      if (path === '/api/chatbot/messages') {
        const body = route.request().postDataJSON()
        requests.push(body)
        if (requests.length === 1) return route.fulfill({ status: 503, json: { title: 'Tạm thời không khả dụng' } })
        return route.fulfill({ json: { conversationId: 'fixture', userMessage: { id: `u${requests.length}`, sender: 1, content: body.message }, assistantMessage: { id: `a${requests.length}`, sender: 2, content: 'Phản hồi giả lập cho kiểm thử giao diện.' }, actions: [] } })
      }
      return route.fulfill({ json: [] })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message) })
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()) })
    page.setDefaultTimeout(15000)
    await page.goto(`${base}/${out}/index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.locator('.homeji-assistant').waitFor({ state: 'attached' })
    await page.getByRole('button', { name: 'Mở chat kiểm thử' }).click()
    const composer = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' })
    await composer.waitFor()
    assert.equal(await page.getByText('Enter để gửi · Shift + Enter xuống dòng', { exact: true }).count(), 0)
    const png = Buffer.from(await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#17877e'; ctx.fillRect(0, 0, 16, 16)
      return canvas.toDataURL('image/png').split(',')[1]
    }), 'base64')
    const upload = page.getByLabel('Chọn ảnh gửi Homeji')
    await upload.setInputFiles(Array.from({ length: 5 }, (_, index) => ({ name: index === 0 ? 'phong.png' : `phong-${index}.png`, mimeType: 'image/png', buffer: png })))
    await page.getByRole('button', { name: 'Gỡ phong.png' }).waitFor()
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await page.getByRole('button', { name: 'Thử lại câu hỏi này' }).click()
    await page.getByText('Phản hồi giả lập cho kiểm thử giao diện.', { exact: true }).waitFor()
    assert.deepEqual(requests[1].attachments, requests[0].attachments, 'Retry must preserve image bytes')
    assert.equal(requests[1].attachments.length, 5)
    assert.equal(requests[1].attachments[0].mimeType, 'image/jpeg')
    await page.screenshot({ path: `${out}/${width}-${theme}-image.png`, fullPage: true })

    async function record(button) {
      await page.getByRole('button', { name: button, exact: true }).click()
      await page.waitForFunction(() => /^00:0[1-9]$/.test(document.querySelector('.glass-voice [role="timer"]')?.textContent ?? ''))
      const shape = await page.locator('.glass-voice').boundingBox()
      assert.ok(shape && Math.abs(shape.width / shape.height - 268 / 82) < .025, 'Recorder expands to the reference capsule ratio')
      await page.getByRole('button', { name: 'Dừng ghi', exact: true }).click()
    }
    assert.equal(await page.getByRole('button', { name: 'Nói thành chữ', exact: true }).count(), 0)
    await composer.fill('')
    await record('Ghi âm tin nhắn')
    await page.waitForFunction(() => document.querySelector('.map-chatbot__form textarea')?.value === 'Tìm phòng dưới ba triệu.').catch(async error => { console.log(JSON.stringify({transcriptions:transcriptions.length, text:await page.locator('.homeji-assistant').innerText(), value:await composer.inputValue()})); throw error })
    assert.equal(transcriptions.length, 1)
    assert.equal(transcriptions[0].audio.mimeType, 'audio/wav')
    assert.equal(Buffer.from(transcriptions[0].audio.data, 'base64').subarray(0, 4).toString(), 'RIFF')
    assert.equal(requests.length, 2, 'Stopping a recording must fill the draft without sending a chat message')
    await composer.fill('Bản nháp sửa lại')
    await page.screenshot({ path: `${out}/${width}-${theme}-voice.png`, fullPage: true })

    await upload.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(4 * 1024 * 1024 + 1) })
    await page.getByRole('alert').filter({ hasText: 'Ảnh tối đa 4 MB' }).waitFor()
    await page.getByRole('button', { name: 'Ghi âm tin nhắn', exact: true }).click()
    await page.getByRole('button', { name: 'Dừng ghi', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Hủy', exact: true }).click()
    assert.equal(await page.locator('.chat-recorder__panel').count(), 0)
    assert.equal(await composer.inputValue(), 'Bản nháp sửa lại')
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Fixture permission denied', 'NotAllowedError') }
    })
    await page.getByRole('button', { name: 'Ghi âm tin nhắn', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Bạn cần cho phép sử dụng micro' }).waitFor()
    assert.equal(await page.locator('.chat-recorder__panel').count(), 0)
    const overflows = await page.locator('.homeji-assistant__media-tools, .homeji-assistant__attachments, .map-chatbot__form').evaluateAll(elements => elements.filter(e => e.scrollWidth > e.clientWidth + 2).length)
    assert.equal(overflows, 0, 'Media controls must fit the viewport')
    assert.deepEqual(errors, [])
    results.push({ width, theme, imageRetry: true, recordedVoice: true, dictationDraft: true, validation: true, cancel: true })
    await context.close()
  }
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
