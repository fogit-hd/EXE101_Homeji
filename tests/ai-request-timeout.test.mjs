import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const clientSource = (await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env.DEV', 'true').replaceAll('import.meta.env.VITE_API_BASE_URL', 'undefined')
const apiSource = await readFile(new URL('../src/api/index.ts', import.meta.url), 'utf8')
function module(source, require, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports, require, ...globals })
  return exports
}
function session() {
  const timers = new Map()
  let id = 0
  let finish
  const client = module(clientSource, name => name === './sessionRefresh' ? {ensureFreshSession:async()=> 'fixture'} : name === './authSession' ? {
    readAuthTokenState: () => ({ token: 'fixture', expired: false }),
  } : {}, {
    AbortController, DOMException, URL,
    window: { location: { origin: 'https://homeji.test' },
      setTimeout: (callback, delay) => { timers.set(++id, { callback, delay }); return id },
      clearTimeout: id => timers.delete(id) },
    fetch: (_url, { signal }) => new Promise((resolve, reject) => {
      finish = () => resolve({ ok: true, status: 200, text: async () => '{"ok":true,"posts":[]}' })
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }),
  })
  const api = module(apiSource, name => name === './client' ? client
    : name === '../lib/ga4' ? { trackFunnelEvent: () => {} }
    : name === '../lib/analyticsPolicy' ? { resultCountBucket: () => '0' } : {})
  return { client, api, timers, finish: () => finish(), advance: ms => {
    for (const timer of [...timers.values()]) if (timer.delay <= ms) timer.callback()
  } }
}
for (const [name, args] of [
  ['sendChatbotMessage', [{ message: 'Explain HTTPS' }]],
  ['parseAiSearch', ['Phòng dưới 4 triệu']],
  ['highlightRentalPosts', [{ text: 'Phòng dưới 4 triệu' }]],
  ['generateRentalDraft', [{}]],
]) {
  test(`${name} can complete after the ordinary 20-second deadline`, async () => {
    const s = session()
    const result = s.api[name](...args)
    await new Promise(resolve => setImmediate(resolve))
    s.advance(25_000)
    s.finish()
    assert.equal((await result).ok, true)
    assert.equal(s.timers.size, 0)
  })
}
test('ordinary requests still time out after 20 seconds', async () => {
  const s = session()
  const result = s.client.apiRequest('/api/profile')
    await new Promise(resolve => setImmediate(resolve))
  s.advance(20_000)
  await assert.rejects(result, error => error.status === 408)
  assert.equal(s.timers.size, 0)
})
test('AI requests remain bounded and release their timer', async () => {
  const s = session()
  const result = s.api.sendChatbotMessage({ message: 'Explain HTTPS' })
    await new Promise(resolve => setImmediate(resolve))
  s.advance(40_000)
  await assert.rejects(result, error => error.status === 408)
  assert.equal(s.timers.size, 0)
})
test('abandoning an AI search cancels immediately without a timeout error', async () => {
  const s = session()
  const controller = new AbortController()
  const result = s.api.highlightRentalPosts({ text: 'Phòng' }, controller.signal)
    await new Promise(resolve => setImmediate(resolve))
  controller.abort()
  await assert.rejects(result, error => error.name === 'AbortError' && error.status === undefined)
  assert.equal(s.timers.size, 0)
})
