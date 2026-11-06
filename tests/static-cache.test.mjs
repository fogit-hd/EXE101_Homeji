import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { applyClientIdentity, CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from '../scripts/proxy-identity.mjs'
import { cacheControlFor, isNotModified } from '../scripts/static-cache.mjs'
import { installStaleBuildReload } from '../src/lib/staleBuildReload.ts'

const IMMUTABLE = 'public, max-age=31536000, immutable'
const PORT = 38476, UPSTREAM_PORT = 38477

test('only content-hashed build files are cached forever', () => {
  for (const path of ['/assets/main-CEUKfXbJ.js', '/assets/HomePage-w_sojN4Y.js', '/assets/main-fIX0Mizj.css']) assert.equal(cacheControlFor(path), IMMUTABLE, path)
  for (const path of ['/assets/public-rental-analytics.js', '/brand/homeji-logo2.png', '/landing/bloom-hero-bg.webp', '/index.html', '/']) assert.equal(cacheControlFor(path), 'no-cache', path)
})

test('revalidation accepts the weak form Cloudflare sends back', () => {
  assert.equal(isNotModified('W/"a-1"', '"a-1"'), true)
  assert.equal(isNotModified('"b-1", "a-1"', '"a-1"'), true)
  assert.equal(isNotModified('"b-1"', '"a-1"'), false)
  assert.equal(isNotModified(undefined, '"a-1"'), false)
})

test('production server caches assets, revalidates the rest and forwards a verified visitor', async t => {
  const dist = await mkdtemp(join(tmpdir(), 'homeji-cache-'))
  await mkdir(join(dist, 'assets'))
  await writeFile(join(dist, 'index.html'), '<!doctype html><title>shell</title>')
  await writeFile(join(dist, 'assets', 'main-CEUKfXbJ.js'), 'export {}')
  await writeFile(join(dist, 'logo.png'), 'png')
  const seen = []
  const upstream = http.createServer((req, res) => { seen.push(req.headers); res.end('{}') })
  await new Promise(resolve => upstream.listen(UPSTREAM_PORT, '127.0.0.1', resolve))
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve-prod.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(PORT), HOMEJI_DIST_DIR: dist, API_PROXY_TARGET: `http://127.0.0.1:${UPSTREAM_PORT}`, PROXY_SHARED_SECRET: 'fixture-secret' },
    stdio: 'ignore', windowsHide: true,
  })
  t.after(async () => {
    child.kill(); upstream.close()
    await rm(dist, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  })
  const get = (path, headers = {}) => fetch(`http://127.0.0.1:${PORT}${path}`, { headers })
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await get('/').then(() => true, () => false)) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const asset = await get('/assets/main-CEUKfXbJ.js')
  assert.equal(asset.headers.get('cache-control'), IMMUTABLE)

  const logo = await get('/logo.png')
  assert.equal(logo.headers.get('cache-control'), 'no-cache')
  const etag = logo.headers.get('etag')
  assert.ok(etag)
  const again = await get('/logo.png', { 'If-None-Match': etag })
  assert.equal(again.status, 304)
  assert.equal(await again.text(), '')

  const route = await get('/explore')
  assert.equal(route.headers.get('cache-control'), 'no-cache', 'A route answered with the app shell never gets a long cache')
  assert.equal((await get('/assets/main-OLDHASH1.js')).status, 404)

  await get('/api/anything', { 'CF-Connecting-IP': '203.0.113.9', [CLIENT_IP_HEADER]: '198.51.100.1', [PROXY_SECRET_HEADER]: 'forged' })
  assert.equal(seen.at(-1)[CLIENT_IP_HEADER], '203.0.113.9', 'A browser cannot choose its own identity')
  assert.equal(seen.at(-1)[PROXY_SECRET_HEADER], 'fixture-secret')
})

test('client identity needs a secret and a valid address', () => {
  const forged = { [CLIENT_IP_HEADER]: '198.51.100.1', [PROXY_SECRET_HEADER]: 'forged' }
  assert.deepEqual(applyClientIdentity({ ...forged }, '10.0.0.1', ''), {}, 'Without a secret nothing is forwarded')
  assert.equal(applyClientIdentity({}, '10.0.0.1', 's')[CLIENT_IP_HEADER], '10.0.0.1', 'Falls back to the connection')
  assert.equal(applyClientIdentity({ 'cf-connecting-ip': 'not-an-ip' }, '10.0.0.1', 's')[CLIENT_IP_HEADER], '10.0.0.1')
  assert.deepEqual(applyClientIdentity({}, undefined, 's'), {}, 'No address means no claim')
})

function staleBuildWindow(storage = new Map()) {
  const target = {
    reloads: 0, listener: null,
    addEventListener: (type, listener) => { assert.equal(type, 'vite:preloadError'); target.listener = listener },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    location: { reload: () => { target.reloads++ } },
  }
  return target
}

test('a missing chunk reloads once, then stops so an outage cannot loop', () => {
  let clock = 1_000_000
  const target = staleBuildWindow()
  installStaleBuildReload(target, () => clock)
  const fire = () => { const event = { prevented: false, preventDefault() { this.prevented = true } }; target.listener(event); return event.prevented }
  assert.equal(fire(), true)
  assert.equal(target.reloads, 1)
  assert.equal(fire(), false, 'The second failure reaches the error boundary')
  assert.equal(target.reloads, 1)
  clock += 61_000
  assert.equal(fire(), true, 'A later deploy can reload again')
  assert.equal(target.reloads, 2)
})

test('without storage it never reloads, because the loop guard would not work', () => {
  const target = staleBuildWindow()
  target.sessionStorage.getItem = () => { throw new Error('blocked') }
  installStaleBuildReload(target)
  target.listener({ preventDefault() { assert.fail('must not swallow the error') } })
  assert.equal(target.reloads, 0)
})
