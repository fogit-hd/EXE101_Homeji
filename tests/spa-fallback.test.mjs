import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { isSpaRoute } from '../scripts/spa-fallback.mjs'

const PORT = 38475

test('only extensionless and HTML paths are application routes', () => {
  for (const path of ['/', '/explore', '/posts/1dbb755c-a098-430b-ab08-0878de1419f0/edit', '/admin/', '/old-page.html', '/a.b/c']) assert.equal(isSpaRoute(path), true, path)
  for (const path of ['/assets/index-abc.js', '/assets/index-abc.css', '/brand/logo.PNG', '/lottie/x.lottie', '/assets/map.js.map']) assert.equal(isSpaRoute(path), false, path)
})

test('production server answers 404 for a missing asset and keeps the SPA fallback', async t => {
  const dist = await mkdtemp(join(tmpdir(), 'homeji-dist-'))
  await mkdir(join(dist, 'assets'))
  await writeFile(join(dist, 'index.html'), '<!doctype html><title>app shell</title>')
  await writeFile(join(dist, 'assets', 'real.js'), 'export {}')
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve-prod.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(PORT), HOMEJI_DIST_DIR: dist }, stdio: 'ignore', windowsHide: true,
  })
  t.after(async () => {
    child.kill()
    await rm(dist, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  })

  const get = path => fetch(`http://127.0.0.1:${PORT}${path}`)
  let shell
  for (let attempt = 0; attempt < 50 && !shell; attempt += 1) {
    try { shell = await get('/explore?from=test') }
    catch { await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  assert.equal(shell?.status, 200)
  assert.match(await shell.text(), /app shell/)

  const real = await get('/assets/real.js')
  assert.equal(real.status, 200)
  assert.match(real.headers.get('content-type'), /javascript/)

  for (const path of ['/assets/missing.js', '/assets/missing.js?v=3', '/brand/missing.png']) {
    const missing = await get(path)
    assert.equal(missing.status, 404, path)
    assert.doesNotMatch(await missing.text(), /app shell/, path)
    assert.equal(missing.headers.get('cache-control'), 'no-store', path)
    assert.equal(missing.headers.get('x-frame-options'), 'DENY', path)
  }
})
