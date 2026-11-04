import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))

async function waitUntilServing(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await fetch(`http://127.0.0.1:${port}/api/ready`)
      return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  throw new Error('serve-prod did not start')
}

test('production proxy carries session cookies and the CSRF inputs in both directions', async t => {
  let received
  const upstream = http.createServer((req, res) => {
    received = req.headers
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': ['__Secure-homeji_rt=a; Path=/api/account/session; Secure; HttpOnly', 'homeji_session_hint=1; Path=/; Secure'],
    })
    res.end('{}')
  })
  t.after(() => upstream.close())
  const upstreamPort = await listen(upstream)
  const probe = http.createServer()
  const port = await listen(probe)
  await new Promise(resolve => probe.close(resolve))

  const proxy = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve-prod.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(port), API_PROXY_TARGET: `http://127.0.0.1:${upstreamPort}` },
    stdio: 'ignore',
  })
  t.after(() => proxy.kill())
  await waitUntilServing(port)

  const response = await fetch(`http://127.0.0.1:${port}/api/account/session`, {
    method: 'POST',
    headers: { Cookie: '__Secure-homeji_rt=a', Origin: 'https://frontend.example.test', 'X-Homeji-Session': 'cookie' },
  })

  assert.equal(response.status, 200)
  assert.equal(received.cookie, '__Secure-homeji_rt=a')
  assert.equal(received.origin, 'https://frontend.example.test')
  assert.equal(received['x-homeji-session'], 'cookie')
  assert.deepEqual(response.headers.getSetCookie(), [
    '__Secure-homeji_rt=a; Path=/api/account/session; Secure; HttpOnly',
    'homeji_session_hint=1; Path=/; Secure',
  ])
})
