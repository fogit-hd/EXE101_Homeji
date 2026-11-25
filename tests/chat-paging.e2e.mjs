import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, devices } from 'playwright'

const output = 'output/verification/chat-paging'
const updated = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5541'
const before = process.env.HOMEJI_CHAT_BASELINE_URL
for (const url of [updated, before].filter(Boolean)) {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Local fixtures only')
}

const attached = {
  id: 'old-attachment', uploaderId: 'peer', context: 0, status: 1,
  mimeType: 'image/jpeg', bytes: 10, width: 1, height: 1,
  contentPath: '/api/conversations/thread-a/messages/1/attachments/old-attachment/content',
}
const createMessage = (index, conversationId = 'thread-a') => ({
  id: String(index).padStart(5, '0'), senderId: 'peer', conversationId,
  body: (index === 1 ? 'Old needle ' : 'Fixture ') + index + ' ' + 'Nội dung hội thoại kiểm thử. '.repeat(7),
  sentAt: new Date(Date.UTC(2026, 10, 25, 0, 0, index)).toISOString(),
  attachments: index === 1 ? [attached] : [],
})

async function writeScene(root) {
  const directory = root ? root + '/' + output : output
  await mkdir(directory, { recursive: true })
  await writeFile(directory + '/index.html', '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
  await writeFile(directory + '/scene.tsx', [
    "import React, {useState} from 'react'",
    "import {createRoot} from 'react-dom/client'",
    "import {MemoryRouter} from 'react-router-dom'",
    "import {AccountQueryProvider} from '/src/contexts/AccountQueryProvider.tsx'",
    "import {persistSession} from '/src/api/client.ts'",
    "import {MapMessagesPanel} from '/src/components/map/MapMessagesPanel.tsx'",
    "import {ToastProvider} from '/src/components/toast/ToastProvider.tsx'",
    "import '/src/index.css'",
    "function Scene() { const [visible, setVisible] = useState(true); const [owner,setOwner] = useState('me'); return <><button type='button' onClick={()=>setVisible(value=>!value)}>Hiện hoặc ẩn hộp thư</button><button type='button' onClick={()=>{persistSession('other-fixture','other'); window.__chatUser = 'other'; setOwner('other')}}>Đổi tài khoản kiểm thử</button><AccountQueryProvider><div data-owner={owner} style={{height:'calc(100dvh - 40px)'}}>{visible && <MapMessagesPanel embedded />}</div></AccountQueryProvider></> }",
    "createRoot(document.getElementById('root')).render(<MemoryRouter><ToastProvider><Scene/></ToastProvider></MemoryRouter>)",
  ].join('\n'))
}

const lastName = 'Người nhận A'
async function fixture(browser, base, { legacy = false, network = false, total = 83 } = {}) {
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  await context.addInitScript(() => {
    localStorage.setItem('homeji_access_token', 'fixture')
    localStorage.setItem('homeji_user_id', 'me')
  })
  await context.route('**/src/contexts/AuthContext.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:window.__chatUser || "me",displayName:"Fixture"}})',
  }))
  const logs = { inbox: 0, recent: 0, legacy: 0, older: 0, search: 0, reads: [], lastPayloadBytes: 0 }
  const threads = {
    'thread-a': Array.from({ length: total }, (_, index) => createMessage(index + 1)),
    'thread-b': [createMessage(1, 'thread-b')],
  }
  const controls = { holdRead: null, tombstones: [], holdInbox: null }
  function inbox(id, name) {
    const latest = threads[id].at(-1)
    return { id, otherParticipantId: 'peer', otherParticipantName: name, subjectType: 0, subjectId: 'room', createdAt: latest.sentAt,
      updatedAt: latest.sentAt, lastMessage: latest.body, unreadCount: 0 }
  }
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (url.pathname === '/api/conversations') {
      logs.inbox++
      if (controls.holdInbox) await controls.holdInbox
      if (route.request().headers().authorization === 'Bearer other-fixture') {
        return route.fulfill({ json: [inbox('thread-b', 'Hộp thư tài khoản khác')] })
      }
      return route.fulfill({ json: [inbox('thread-a', lastName), inbox('thread-b', 'Người nhận B')] })
    }
    const match = url.pathname.match(/^\/api\/conversations\/(thread-[ab])\/(messages(?:\/(?:page|search|attachment-deletions))?|read)$/)
    if (!match) return route.fulfill({ status: 404, json: {} })
    const [, threadId, action] = match
    const messages = threads[threadId]
    if (action === 'read') {
      logs.reads.push(route.request().postDataJSON().messageId)
      if (controls.holdRead) await controls.holdRead
      return route.fulfill({ json: { unreadCount: 0, notificationsChanged: false } })
    }
    if (action.endsWith('attachment-deletions')) return route.fulfill({ json: controls.tombstones })
    const beforeId = url.searchParams.get('beforeId')
    const query = url.searchParams.get('query')
    const available = messages.filter(message => (!beforeId || message.id < beforeId) && (!query || message.body.toLowerCase().includes(query.toLowerCase())))
    let payload
    if (action === 'messages') {
      assert.ok(legacy, 'The updated frontend must never request the full history')
      logs.legacy++
      payload = available
    } else {
      if (query) logs.search++
      else if (beforeId) logs.older++
      else logs.recent++
      const items = available.slice(-40)
      payload = { items, nextCursor: available.length > 40 ? { id: items[0].id, sentAt: items[0].sentAt } : null }
    }
    const body = JSON.stringify(payload)
    if (!query && !beforeId) logs.lastPayloadBytes = Buffer.byteLength(body)
    // Simulate one 120ms round trip plus serialization transfer at 1.6 Mb/s.
    if (network) await delay(120 + Buffer.byteLength(body) / 200)
    await route.fulfill({ contentType: 'application/json', body })
  })

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/' + output + '/index.html')
  const row = page.locator('.map-messages__row').filter({ hasText: lastName })
  await row.waitFor()
  const latestBubble = () => page.locator('.map-messages__bubble-body').getByText(threads['thread-a'].at(-1).body, { exact: true })
  const open = async () => {
    const start = performance.now()
    await row.click()
    await latestBubble().waitFor({ state: 'visible' })
    return performance.now() - start
  }
  const notify = () => page.evaluate(() => window.dispatchEvent(new CustomEvent('homeji:notification-received', {
    detail: { ownerId: 'me', notification: { type: 10, relatedEntityId: 'thread-a', isRead: false } },
  })))
  return { context, page, logs, controls, threads, open, notify, latestBubble, errors }
}

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
await writeScene()
try {
  const live = await fixture(browser, updated)
  const { page, logs, controls, threads } = live
  let releaseRead
  controls.holdRead = new Promise(resolve => { releaseRead = resolve })
  await live.open()
  const rows = page.locator('.map-messages__bubble-body')
  assert.equal(await rows.count(), 40)
  await page.waitForFunction(() => document.querySelector('.map-messages__bubbles')?.scrollTop > 0)
  assert.equal(await rows.getByText(/Old needle/).count(), 0)
  assert.equal(logs.recent, 1)
  threads['thread-a'].push(createMessage(84))
  await live.notify()
  await live.latestBubble().waitFor()
  assert.equal(logs.legacy, 0)
  controls.holdRead = null
  releaseRead()
  for (let attempt = 0; attempt < 100 && !logs.reads.includes('00084'); attempt++) await delay(20)
  assert.equal(logs.reads.at(-1), '00084')
  await live.notify()
  await delay(250)
  assert.equal(await live.latestBubble().count(), 1)

  await page.locator('.map-messages__bubbles').evaluate(node => { node.scrollTop = 0 })
  await rows.getByText(threads['thread-a'][42].body, { exact: true }).waitFor()
  assert.ok(await page.locator('.map-messages__bubbles').evaluate(node => node.scrollTop > 0), 'Prepending history must preserve the viewport position')
  assert.equal(logs.older, 1)

  await page.getByRole('button', { name: 'Tìm kiếm tin nhắn' }).click()
  await page.getByRole('textbox', { name: 'Tìm kiếm theo từ khóa trong hội thoại' }).fill('Old needle')
  await rows.getByText(/Old needle/).waitFor()
  assert.equal(await rows.count(), 1)
  assert.equal(logs.search, 1)
  await page.getByRole('button', { name: 'Đóng tìm kiếm' }).click()
  assert.equal(await rows.getByText(/Old needle/).count(), 0)
  await page.locator('.map-messages__bubbles').evaluate(node => {
    node.scrollTop = 0
    node.dispatchEvent(new Event('scroll'))
  })
  await rows.getByText(/Old needle/).waitFor()
  controls.tombstones = [{ messageId: '00001', attachmentId: 'old-attachment' }]
  for (let index = 85; index < 170; index++) threads['thread-a'].push(createMessage(index))
  await page.evaluate(() => window.dispatchEvent(new Event('homeji:notification-connected')))
  await live.latestBubble().waitFor({ state: 'attached' })
  assert.equal(await rows.count(), 169, 'Reconnect must fill a gap larger than two pages')
  await page.getByText('Tệp đã được người gửi xóa').waitFor({ state: 'attached' })
  assert.equal(logs.legacy, 0)

  await page.getByRole('button', { name: 'Hiện hoặc ẩn hộp thư' }).click()
  let releaseInbox
  controls.holdInbox = new Promise(resolve => { releaseInbox = resolve })
  await page.getByRole('button', { name: 'Hiện hoặc ẩn hộp thư' }).click()
  await page.locator('.map-messages__row').filter({ hasText: lastName }).waitFor({ timeout: 2_000 })
  await page.getByRole('button', { name: 'Đổi tài khoản kiểm thử' }).click()
  assert.equal(await page.locator('.map-messages__row').filter({ hasText: lastName }).count(), 0)
  controls.holdInbox = null
  releaseInbox()
  await page.locator('.map-messages__row').filter({ hasText: 'Hộp thư tài khoản khác' }).waitFor()
  assert.deepEqual(live.errors, [])
  await live.context.close()
  console.log('PASS bounded history, older-page scroll, full-history search, in-flight reads, reconnect gap, attachment deletion, warm inbox and account isolation')

  if (before) {
    assert.ok(process.env.HOMEJI_CHAT_BASELINE_ROOT, 'The optional baseline server needs HOMEJI_CHAT_BASELINE_ROOT')
    await writeScene(process.env.HOMEJI_CHAT_BASELINE_ROOT)
    const r = { legacy: [], current: [], legacyWarm: [], currentWarm: [] }
    const payloads = {}
    for (let trial = 0; trial < 10; trial++) {
      for (const [name, base, legacy] of [['legacy', before, true], ['current', updated, false]]) {
        const sample = await fixture(browser, base, { legacy, network: true, total: 1_000 })
        const cdp = await sample.context.newCDPSession(sample.page)
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
        r[name].push(await sample.open())
        payloads[name] = sample.logs.lastPayloadBytes
        await sample.page.getByRole('button', { name: 'Hiện hoặc ẩn hộp thư' }).click()
        await sample.page.getByRole('button', { name: 'Hiện hoặc ẩn hộp thư' }).click()
        r[name + 'Warm'].push(await sample.open())
        assert.deepEqual(sample.errors, [])
        await sample.context.close()
      }
    }
    const p95 = values => Math.round(values.slice().sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1])
    const summary = { trials: 10, p95Ms: Object.fromEntries(Object.entries(r).map(([name, values]) => [name, p95(values)])), payloads }
    console.log(JSON.stringify(summary))
    await writeFile(output + '/benchmark.json', JSON.stringify({ ...summary, samplesMs: r }, null, 2))
    assert.ok(p95(r.current) <= p95(r.legacy) * .7, 'Fixture open-to-first-message p95 must fall by at least 30%')
  }
} finally {
  await browser.close()
}
