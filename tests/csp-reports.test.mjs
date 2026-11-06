import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { contentSecurityPolicy, CSP_REPORT_PATH, securityHeaders } from '../scripts/security-headers.mjs'

const PORT = 38473

test('policy reports to the API through report-uri only, because report-to silences it in Chromium', () => {
  const policy = contentSecurityPolicy()
  assert.equal(CSP_REPORT_PATH, '/api/csp-reports')
  assert.match(policy, /report-uri \/api\/csp-reports(;|$)/)
  assert.doesNotMatch(policy, /report-to/)
  assert.equal(securityHeaders()['Reporting-Endpoints'], undefined)
})

test('production server forwards a report to the API with its content type and body', async t => {
  const received = []
  const api = http.createServer((req, res) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      received.push({ method: req.method, url: req.url, type: req.headers['content-type'], body: Buffer.concat(chunks).toString('utf8') })
      res.writeHead(204)
      res.end()
    })
  })
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve))
  t.after(() => api.close())

  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve-prod.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(PORT), API_PROXY_TARGET: `http://127.0.0.1:${api.address().port}` },
    stdio: 'ignore',
    windowsHide: true,
  })
  t.after(() => child.kill())

  const report = JSON.stringify({ 'csp-report': { 'effective-directive': 'script-src-elem', 'blocked-uri': 'inline' } })
  let response
  for (let attempt = 0; attempt < 50 && !response; attempt += 1) {
    try {
      response = await fetch(`http://127.0.0.1:${PORT}${CSP_REPORT_PATH}`, { method: 'POST', headers: { 'Content-Type': 'application/csp-report' }, body: report })
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  assert.equal(response?.status, 204)
  assert.deepEqual(received, [{ method: 'POST', url: CSP_REPORT_PATH, type: 'application/csp-report', body: report }])
})
