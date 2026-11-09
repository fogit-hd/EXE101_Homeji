// Ordinary chatbot sends must not touch Google. Only a burst, answered by the API with
// chatbot_captcha_required, opens the checkbox and the request is then sent again exactly once.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5546'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local fixtures only')
const out = 'output/verification/chatbot-captcha'
await mkdir(out, { recursive: true })
const html = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>'
const scene = `
import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
import{ChatbotProvider}from'/src/contexts/ChatbotContext.tsx';import{ToastProvider}from'/src/components/toast/ToastProvider.tsx';import{toggleHomejiAi}from'/src/lib/homejiAiLauncher.ts';
import'/src/index.css';import'/src/components/ui/confirmDialog.css';
createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><ChatbotProvider><button data-homeji-ai-trigger="" onClick={event=>toggleHomejiAi(event.currentTarget,true)}>Mở chat kiểm thử</button></ChatbotProvider></ToastProvider></MemoryRouter>);
`
// Rewriting unchanged scene files would make Vite reload the open page.
async function writeIfChanged(path, text) {
  if (await readFile(path, 'utf8').catch(() => '') !== text) await writeFile(path, text)
}
await writeIfChanged(`${out}/index.html`, html)
await writeIfChanged(`${out}/scene.tsx`, scene)

// Stands in for Google's script: the checkbox is a button that hands back a fixed token.
const fakeRecaptcha = `window.grecaptcha = {
  ready: callback => callback(),
  execute: () => Promise.reject(new Error('v3 must not run')),
  render: (container, options) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Tôi không phải người máy'
    button.addEventListener('click', () => options.callback('checkbox-token'))
    container.append(button)
    return 1
  },
}`

const browser = await chromium.launch({ headless: true, executablePath: process.env.HOMEJI_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1,onboardingCompleted:true}})' }))
  await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})' }))
  // The same session hint the other chatbot suites use, so the client treats the user as signed in.
  await context.addInitScript(() => localStorage.setItem('homeji_access_token', 'fixture'))
  const google = []
  await context.route('https://www.google.com/recaptcha/**', route => {
    google.push(route.request().url())
    return route.fulfill({ contentType: 'application/javascript', body: fakeRecaptcha })
  })
  const sends = []
  let sinceReset = 0
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: true, greeting: 'Dữ liệu kiểm thử local', suggestedPrompts: [], historyStorageEnabled: false, recaptchaSiteKey: null } })
    if (path === '/api/chatbot/messages') {
      const body = route.request().postDataJSON()
      const token = route.request().headers()['x-homeji-recaptcha'] ?? null
      sends.push({ message: body.message, token })
      if (token === 'checkbox-token') sinceReset = 0
      else if (++sinceReset > 5) {
        return route.fulfill({ status: 403, json: { title: 'Forbidden', status: 403, detail: 'Bạn vừa gửi nhiều yêu cầu liên tiếp. Hãy xác minh để tiếp tục.', code: 'chatbot_captcha_required', captchaSiteKey: 'checkbox-site-key' } })
      }
      const n = sends.length
      return route.fulfill({ json: { conversationId: 'fixture', userMessage: { id: `u${n}`, sender: 1, content: body.message }, assistantMessage: { id: `a${n}`, sender: 2, content: `Trả lời ${body.message}` }, actions: [] } })
    }
    return route.fulfill({ json: [] })
  })

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.setDefaultTimeout(15000)
  await page.goto(`${base}/${out}/index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.locator('.homeji-assistant').waitFor({ state: 'attached' })
  await page.getByRole('button', { name: 'Mở chat kiểm thử' }).click()
  const composer = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' })
  await composer.waitFor()

  async function send(text) {
    await composer.fill(text)
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  }

  for (let i = 1; i <= 5; i++) {
    await send(`câu ${i}`)
    await page.getByText(`Trả lời câu ${i}`, { exact: true }).waitFor()
  }
  assert.equal(google.length, 0, 'ordinary sends must not load Google')
  assert.ok(sends.every(row => row.token === null), 'ordinary sends carry no token')

  await send('câu 6')
  const dialog = page.getByRole('dialog', { name: 'Xác minh yêu cầu chatbot' })
  await dialog.waitFor()
  await page.screenshot({ path: `${out}/challenge.png` })
  await dialog.getByRole('button', { name: 'Tôi không phải người máy' }).click()
  await page.getByText('Trả lời câu 6', { exact: true }).waitFor()
  assert.equal(await dialog.count(), 0, 'the dialog closes after the checkbox')
  assert.deepEqual(sends.slice(5).map(row => row.token), [null, 'checkbox-token'], 'the blocked request is sent again once, with the token')
  assert.equal(google.length, 1, 'Google loads only for the challenge')

  for (let i = 7; i <= 11; i++) {
    await send(`câu ${i}`)
    await page.getByText(`Trả lời câu ${i}`, { exact: true }).waitFor()
  }
  const before = sends.length
  await send('câu 12')
  await dialog.waitFor()
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
  await dialog.waitFor({ state: 'detached' })
  await page.waitForTimeout(500)
  assert.equal(sends.length, before + 1, 'cancelling sends nothing more')
  assert.equal(await page.getByText('Trả lời câu 12', { exact: true }).count(), 0)
  assert.equal(await page.locator('#root').evaluate(root => root.inert), false, 'the page is usable again after cancelling')

  assert.deepEqual(errors, [])
  console.log('PASS ordinary sends skip Google; a burst opens the checkbox, retries once with its token, and cancelling sends nothing')
} finally {
  await browser.close()
}
