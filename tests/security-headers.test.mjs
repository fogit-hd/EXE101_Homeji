import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { contentSecurityPolicy, inlineScriptHashes, securityHeaders } from '../scripts/security-headers.mjs'

const PORT = 38471

function directive(policy, name) {
  return policy.split('; ').find(part => part.startsWith(`${name} `))?.split(' ').slice(1) ?? []
}

test('hashes inline scripts only, over their exact body', () => {
  const expected = `'sha256-${createHash('sha256').update('run()', 'utf8').digest('base64')}'`
  assert.deepEqual(inlineScriptHashes('<script>run()</script><script type="module" src="/a.js"></script>'), [expected])
})

test('hashes match what browsers execute when the build has CRLF line endings', () => {
  assert.deepEqual(inlineScriptHashes('<script>a()\r\nb()\rc()</script>'), inlineScriptHashes('<script>a()\nb()\nc()</script>'))
})

test('policy never allows inline or evaluated scripts', () => {
  const scripts = directive(contentSecurityPolicy(["'sha256-x'"]), 'script-src')
  assert.ok(scripts.includes("'sha256-x'"))
  assert.ok(!scripts.includes("'unsafe-inline'"))
  assert.ok(!scripts.includes("'unsafe-eval'"))
  assert.deepEqual(directive(contentSecurityPolicy(), 'object-src'), ["'none'"])
})

test('GA4 may collect through google.com without opening the whole host', () => {
  const connections = directive(contentSecurityPolicy(), 'connect-src')
  assert.ok(connections.includes('https://www.google.com/g/collect'))
  assert.ok(!connections.includes('https://www.google.com'))
})

test('CSP stays Report-Only while framing and HSTS are enforced', () => {
  const headers = securityHeaders()
  assert.ok(headers['Content-Security-Policy-Report-Only'])
  assert.equal(headers['Content-Security-Policy'], undefined)
  assert.equal(headers['X-Frame-Options'], 'DENY')
  assert.match(headers['Strict-Transport-Security'], /max-age=\d+/)
})

test('production server sends the headers on pages it serves itself', async t => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve-prod.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore', windowsHide: true,
  })
  t.after(() => child.kill())
  let response
  for (let attempt = 0; attempt < 50 && !response; attempt += 1) {
    try { response = await fetch(`http://127.0.0.1:${PORT}/robots.txt`) }
    catch { await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  assert.ok(response, 'serve-prod did not start')
  assert.ok(response.headers.get('content-security-policy-report-only'))
  assert.equal(response.headers.get('x-frame-options'), 'DENY')
  assert.ok(response.headers.get('strict-transport-security'))
})
