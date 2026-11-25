import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const out = 'output/verification/chat-cache'
await mkdir(out, { recursive: true })
await writeFile(out + '/index.html', '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(out + '/scene.tsx', [
  "import React, {useState} from 'react'",
  "import {createRoot} from 'react-dom/client'",
  "import {MemoryRouter} from 'react-router-dom'",
  "import {AccountQueryProvider} from '/src/contexts/AccountQueryProvider.tsx'",
  "import {ChatbotProvider} from '/src/contexts/ChatbotContext.tsx'",
  "import {MapMessagesPanel} from '/src/components/map/MapMessagesPanel.tsx'",
  "import {getStoredSession, clearSession, persistSession} from '/src/api/client.ts'",
  "import {ToastProvider} from '/src/components/toast/ToastProvider.tsx'",
  "import {toggleHomejiAi} from '/src/lib/homejiAiLauncher.ts'",
  "import '/src/index.css'",
  "getStoredSession()",
  "function Scene(){const [state,setState]=useState('a'); const [visible,setVisible]=useState(true);return <AccountQueryProvider><ChatbotProvider><button type='button' onClick={()=>setVisible(value=>!value)}>Mở hoặc đóng hộp thư</button><button type='button' onClick={()=>{clearSession(); window.__cacheOwner=null; setState('guest')}}>Đăng xuất kiểm thử</button><button type='button' onClick={()=>{persistSession('fixture-b','b'); window.__cacheOwner='b'; setState('b')}}>Đổi tài khoản kiểm thử</button><button data-homeji-ai-trigger='' onClick={e=>toggleHomejiAi(e.currentTarget)}>Mở AI kiểm thử</button><div style={{height:'calc(100dvh - 60px)'}}>{visible && state!=='guest' && <MapMessagesPanel embedded initialConversationId='thread-a'/>}</div></ChatbotProvider></AccountQueryProvider>}",
  "createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><Scene/></ToastProvider></MemoryRouter>)",
].join('\n'))

const stamp = '2026-11-25T12:00:00Z'
const author = 'peer'
const oldText = 'Nội dung nhạy cảm dành cho tài khoản A'
const keptText = 'Tin xác nhận còn trên máy chủ'
const attachmentId = 'image-1'
const attachment = { id: attachmentId, uploaderId: author, context: 0, status: 1, mimeType: 'image/png', bytes: 68, width: 1, height: 1, contentPath: '/api/conversations/thread-a/messages/2/attachments/image-1/content', createdAt: stamp, deletedAt: null }
const message = (id, body, attachments = []) => ({ id, conversationId: 'thread-a', senderId: author, body, sentAt: stamp, attachments })
let directMessages = [message('1', oldText), message('2', keptText, [attachment])]
let holdRecent, holdInbox, holdAssistant
let readCount = 0, recentCount = 0
let assistantStatus = 200
const assistantMessages = []
const delayed = () => {
  let release
  const promise = new Promise(resolve => { release = resolve })
  return { release, promise }
}
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 820 } })
  await context.addInitScript(() => {
    window.__cacheOwner = 'a'
    localStorage.setItem('homeji_access_token', 'fixture-a')
    localStorage.setItem('homeji_user_id', 'a')
  })
  await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const useAuth=()=>({isAuthenticated:!!window.__cacheOwner,isLoading:false,profile:window.__cacheOwner?{id:window.__cacheOwner,role:1,displayName:"Fixture"}:null})',
  }))
  await context.route('**/src/contexts/AuthModalContext.logic.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const useAuthModal=()=>({isOpen:false,openAuthModal:()=>{}})',
  }))
  await context.route('**/api/**', async route => {
    const { pathname: path, searchParams } = new URL(route.request().url())
    if (!path.startsWith('/api/')) return route.continue()
    const other = route.request().headers().authorization === 'Bearer fixture-b'
    if (path === '/api/conversations') {
      await holdInbox?.promise
      return route.fulfill({ json: other ? [] : [{ id: 'thread-a', subjectType: 0, subjectId: 'subject', otherParticipantId: author, otherParticipantName: 'Người nhận A', createdAt: stamp, updatedAt: stamp, lastMessage: keptText, unreadCount: 0 }] })
    }
    if (path.endsWith('/messages/page')) {
      recentCount++
      await holdRecent?.promise
      return route.fulfill({ json: { items: other ? [] : directMessages, nextCursor: null } })
    }
    if (path.endsWith('/attachment-deletions')) return route.fulfill({ json: [] })
    if (path.endsWith('/content')) {
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jLZsAAAAASUVORK5CYII=', 'base64') })
    }
    if (path.endsWith('/read')) {
      readCount++
      return route.fulfill({ json: { unreadCount: 0, notificationsChanged: false } })
    }
    if (path === '/api/chatbot/popup-config') return route.fulfill({ json: { enabled: true, suggestedPrompts: [], historyStorageEnabled: true } })
    if (path === '/api/chatbot/agent/session') return route.fulfill({ json: null })
    if (path === '/api/chatbot/messages') {
      const input = route.request().postDataJSON()
      const conversationId = 'ai-saved'
      const userMessage = { id: input.saveHistory ? 'saved-user' : 'temporary-user', conversationId, sender: 1, createdAt: stamp, content: input.message }
      const assistantMessage = { id: input.saveHistory ? 'saved-reply' : 'temporary-reply', conversationId, sender: 2, createdAt: stamp,
        content: input.saveHistory ? 'Phản hồi AI đã lưu' : 'Phản hồi AI tạm thời' }
      if (input.saveHistory) assistantMessages.push(userMessage, assistantMessage)
      return route.fulfill({ json: { conversationId, userMessage, assistantMessage, actions: [] } })
    }
    if (path === '/api/chatbot/conversations/ai-saved/messages') {
      assert.equal(searchParams.get('limit'), '40')
      await holdAssistant?.promise
      return route.fulfill(assistantStatus === 200 ? { json: assistantMessages } : { status: assistantStatus, json: { title: 'Đã xóa' } })
    }
    return route.fulfill({ json: {} })
  })

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const bubble = text => page.locator('.map-messages__bubble-body').getByText(text, { exact: true })
  const cacheRecord = async id => page.evaluate(async id => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('homeji-chat-cache')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    try {
      if (!db.objectStoreNames.contains('cache')) return null
      const value = await new Promise((resolve, reject) => {
        const req = db.transaction('cache').objectStore('cache').get(id)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      return value ? {
        ownerId: value.ownerId, extractable: value.key?.extractable, algorithm: value.key?.algorithm?.name,
        ivLength: value.iv?.length, bytes: value.ciphertext?.byteLength, removed: value.removed,
        plaintext: value.ciphertext ? new TextDecoder().decode(value.ciphertext) : undefined,
      } : null
    } finally { db.close() }
  }, id)
  async function waitForCache(test) {
    for (let i = 0; i < 100; i++) {
      const result = await test()
      if (result) return result
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error('Encrypted cache did not reach expected state')
  }
  await page.goto(base + '/' + out + '/index.html')
  await bubble(keptText).waitFor()
  const stored = await waitForCache(async () => {
    const record = await cacheRecord('thread:thread-a')
    return record?.bytes ? record : null
  })
  assert.equal(stored.ivLength, 12)
  assert.ok(!stored.plaintext.includes(oldText))
  const identity = await cacheRecord('identity')
  assert.equal(identity.algorithm, 'AES-GCM')
  assert.equal(identity.extractable, false)
  await waitForCache(async () => (await cacheRecord('inbox'))?.bytes)

  const previousReads = readCount
  const beforeOffline = recentCount
  await context.setOffline(true)
  const toggle = page.getByRole('button', { name: 'Mở hoặc đóng hộp thư' })
  await toggle.click()
  await toggle.click()
  await bubble(oldText).waitFor()
  assert.equal(recentCount, beforeOffline)
  assert.equal(readCount, previousReads)

  holdRecent = delayed()
  holdInbox = delayed()
  await context.setOffline(false)
  await page.reload()
  await bubble(oldText).waitFor()
  await page.getByText('Đang xem tin nhắn đã lưu trên thiết bị.', { exact: true }).waitFor()
  await page.locator('.map-messages__row').filter({ hasText: 'Người nhận A' }).waitFor()
  assert.equal(readCount, previousReads, 'Cached messages alone must never send a read acknowledgment')
  directMessages = [message('2', keptText, [{ ...attachment, status: 2, bytes: 0, deletedAt: stamp }]), message('3', 'Tin mới sau đồng bộ')]
  holdInbox.release()
  holdRecent.release()
  holdInbox = holdRecent = undefined
  await bubble('Tin mới sau đồng bộ').waitFor()
  await bubble(oldText).waitFor({ state: 'detached' })
  await page.getByText('Tệp đã được người gửi xóa', { exact: true }).waitFor()

  const openAi = page.getByRole('button', { name: 'Mở AI kiểm thử' })
  await openAi.click()
  const input = page.getByRole('textbox', { name: 'Nhập tin nhắn cho Homeji' })
  await input.fill('Nội dung AI chỉ dùng trong phiên')
  await page.getByText('Quyền riêng tư & lịch sử', { exact: true }).click()
  const consent = page.getByRole('checkbox', { name: /Đồng ý lưu hội thoại/ })
  await consent.waitFor()
  await input.press('Enter')
  await page.getByText('Phản hồi AI tạm thời', { exact: true }).waitFor()
  assert.equal((await cacheRecord('assistant'))?.bytes, undefined)

  await consent.check()
  await input.fill('Nội dung AI được phép lưu')
  await input.press('Enter')
  await page.getByText('Phản hồi AI đã lưu', { exact: true }).waitFor()
  await waitForCache(async () => (await cacheRecord('assistant'))?.bytes)

  holdAssistant = delayed()
  await page.reload()
  await openAi.click()
  await page.getByText('Phản hồi AI đã lưu', { exact: true }).waitFor()
  await page.getByText('Đang xem hội thoại AI đã lưu trên thiết bị.', { exact: true }).waitFor()
  assert.equal(await page.getByText('Phản hồi AI tạm thời', { exact: true }).count(), 0)
  assistantStatus = 404
  holdAssistant.release()
  holdAssistant = undefined
  await page.getByText('Phản hồi AI đã lưu', { exact: true }).waitFor({ state: 'detached' })
  await waitForCache(async () => (await cacheRecord('assistant'))?.removed)
  await page.locator('[data-homeji-ai-panel="open"]').getByRole('button', { name: /Đóng/ }).first().click()

  await page.getByRole('button', { name: 'Đổi tài khoản kiểm thử' }).click()
  await bubble(keptText).waitFor({ state: 'detached' })
  await waitForCache(async () => (await cacheRecord('identity'))?.ownerId === 'b')
  await page.getByRole('button', { name: 'Đăng xuất kiểm thử' }).click()
  await waitForCache(async () => (await cacheRecord('identity')) === null)
  assert.equal(await cacheRecord('thread:thread-a'), null)
  assert.equal(await cacheRecord('inbox'), null)
  assert.deepEqual(errors, [])
  console.log('PASS encrypted Chrome reload, offline remount, fresh snapshot and deletion, account swap, logout purge, AI opt-in and removal')
} finally {
  await browser.close()
}
