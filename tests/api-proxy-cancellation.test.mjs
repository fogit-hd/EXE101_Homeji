import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

async function bounded(promise) {
  let timer
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('HTTP proxy test timed out')), 5_000)
    })])
  } finally { clearTimeout(timer) }
}

async function listen(server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return server.address().port
}

function request(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, ...options }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { body += chunk })
      res.once('end', () => resolve({ status: res.statusCode, body }))
      res.once('error', reject)
    })
    req.once('error', reject)
    req.end(options.body)
  })
}

test('production API proxy cancels disconnected clients and preserves normal/error responses', { timeout: 30_000 }, async t => {
  const observed = new Map()
  const observation = path => {
    if (!observed.has(path)) observed.set(path, { received: deferred(), closed: deferred() })
    return observed.get(path)
  }
  const upstream = http.createServer((req, res) => {
    const state = observation(req.url)
    res.once('close', () => state.closed.resolve({ complete: res.writableFinished }))
    if (req.url === '/api/fail') { req.socket.destroy(); return }
    if (req.url === '/api/fail-stream') {
      state.response = res
      res.writeHead(200, { 'Content-Length': '100' })
      res.write('partial')
      return
    }
    if (req.url === '/api/upload') {
      req.once('data', () => state.received.resolve())
      return
    }
    state.received.resolve()
    if (req.url === '/api/slow') return
    if (req.url === '/api/stream') { res.write('first chunk'); return }
    let body = ''
    req.setEncoding('utf8')
    req.on('data', chunk => { body += chunk })
    req.once('end', () => setImmediate(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ body, ok: true }))
    }))
  })
  const upstreamPort = await listen(upstream)
  // Reserve an OS-selected port before starting the unmodified production entry point.
  const reservation = http.createServer()
  const proxyPort = await listen(reservation)
  await new Promise(resolve => reservation.close(resolve))
  const child = spawn(process.execPath, ['scripts/serve-prod.mjs'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, PORT: String(proxyPort), API_PROXY_TARGET: `http://127.0.0.1:${upstreamPort}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  let stdout = ''
  child.stderr.on('data', chunk => { stderr += chunk })
  const ready = deferred()
  child.stdout.on('data', chunk => {
    stdout += chunk
    if (stdout.includes('Homeji web listening')) ready.resolve()
  })
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit')
      child.kill()
      await bounded(exited)
    }
    upstream.closeAllConnections()
    await new Promise(resolve => upstream.close(resolve))
  })
  await bounded(Promise.race([ready.promise, once(child, 'exit').then(() => {
    throw new Error(`Proxy exited before listening: ${stderr}`)
  })]))

  await t.test('disconnect before response headers closes upstream without a false 502', async () => {
    const req = http.get(`http://127.0.0.1:${proxyPort}/api/slow`)
    req.on('error', () => {})
    await bounded(observation('/api/slow').received.promise)
    req.destroy()
    assert.deepEqual(await bounded(observation('/api/slow').closed.promise), { complete: false })
  })

  await t.test('disconnect while streaming closes the upstream response', async () => {
    const started = deferred()
    const req = http.get(`http://127.0.0.1:${proxyPort}/api/stream`, res => {
      res.on('error', () => {})
      res.once('data', () => { res.destroy(); req.destroy(); started.resolve() })
    })
    req.on('error', () => {})
    await bounded(started.promise)
    assert.deepEqual(await bounded(observation('/api/stream').closed.promise), { complete: false })
  })

  await t.test('disconnect during request upload closes upstream', async () => {
    const req = http.request({ host: '127.0.0.1', port: proxyPort, path: '/api/upload', method: 'POST' })
    req.on('error', () => {})
    req.write('unfinished upload')
    await bounded(observation('/api/upload').received.promise)
    req.destroy()
    assert.deepEqual(await bounded(observation('/api/upload').closed.promise), { complete: false })
  })

  await t.test('a completed POST upload still receives its full response', async () => {
    for (let index = 0; index < 3; index++) {
      const result = await bounded(request(proxyPort, '/api/normal', { method: 'POST', body: `hello ${index}` }))
      assert.equal(result.status, 200)
      assert.deepEqual(JSON.parse(result.body), { body: `hello ${index}`, ok: true })
    }
    assert.equal(stderr, '', 'intentional cancellation must not log socket errors')
  })

  await t.test('a genuine upstream failure before headers returns JSON 502', async () => {
    const result = await bounded(request(proxyPort, '/api/fail'))
    assert.equal(result.status, 502)
    assert.equal(JSON.parse(result.body).title, 'Bad Gateway')
    assert.match(stderr, /\[api-proxy\]/)
  })

  await t.test('an upstream stream failure terminates the partial body instead of appending JSON', async () => {
    const result = await bounded(new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${proxyPort}/api/fail-stream`, res => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => {
          body += chunk
          observation('/api/fail-stream').response.destroy()
        })
        res.once('end', () => reject(new Error('Truncated response must not finish successfully')))
        res.once('error', () => resolve({ body, complete: res.complete }))
      })
      req.once('error', () => resolve({ body: '', complete: false }))
    }))
    assert.equal(result.complete, false)
    assert.equal(result.body, 'partial')
    assert.doesNotMatch(result.body, /Bad Gateway|API proxy failed/)
    assert.equal(child.exitCode, null)
    assert.equal((await bounded(request(proxyPort, '/api/normal'))).status, 200)
  })
})
