import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createReportLog, normalizeReports, sanitizeReportUrl } from '../scripts/csp-reports.mjs'
import { contentSecurityPolicy, securityHeaders } from '../scripts/security-headers.mjs'

const PORT = 38473
const SECRET = 'reset-secret-value'

test('logged URLs lose query strings, fragments and credentials', () => {
  assert.equal(sanitizeReportUrl(`https://user:pw@homeji.onrender.com/reset-password?token=${SECRET}#${SECRET}`), 'https://homeji.onrender.com/reset-password')
  assert.equal(sanitizeReportUrl('inline'), 'inline')
  assert.equal(sanitizeReportUrl('data:text/html,secret'), 'data')
  assert.equal(sanitizeReportUrl('not a url\nforged'), 'invalid')
})

test('reads the Chromium and WebKit formats and ignores other report types', () => {
  const expected = { document: 'https://h.test/a', directive: 'script-src-elem', blocked: 'https://evil.test/x.js', source: undefined, line: 3, disposition: 'report' }
  assert.deepEqual(normalizeReports({ 'csp-report': { 'document-uri': 'https://h.test/a?q=1', 'effective-directive': 'script-src-elem', 'blocked-uri': 'https://evil.test/x.js', 'line-number': 3, disposition: 'report' } }), [expected])
  assert.deepEqual(normalizeReports({ type: 'csp-violation', url: 'https://h.test/a', body: { documentURL: 'https://h.test/a', effectiveDirective: 'script-src-elem', blockedURL: 'https://evil.test/x.js', lineNumber: 3, disposition: 'report' } }), [expected])
  for (const junk of [null, 1, 'x', {}, [], [null], { 'csp-report': 'x' }, { 'csp-report': [] }, { type: 'deprecation', body: {} }, { type: 'csp-violation', body: 'x' }]) assert.deepEqual(normalizeReports(junk), [])
})

test('directive values cannot forge extra log lines', () => {
  const [report] = normalizeReports({ 'csp-report': { 'effective-directive': 'a\n{"event":"forged"}\u2028' } })
  assert.equal(report.directive.includes('\n'), false)
  assert.equal(report.directive.includes('\u2028'), false)
})

test('log volume is capped per window and the dropped count is reported', () => {
  const lines = []
  let time = 0
  const log = createReportLog({ write: line => lines.push(line), now: () => time })
  for (let index = 0; index < 100; index += 1) log({ directive: 'x' })
  assert.equal(lines.length, 60)
  time = 60_000
  log({ directive: 'y' })
  assert.deepEqual(JSON.parse(lines[60]), { event: 'csp-violations-dropped', count: 40 })
  assert.equal(JSON.parse(lines[61]).directive, 'y')
})

test('policy reports through report-uri only, because report-to silences it in Chromium', () => {
  const policy = contentSecurityPolicy()
  assert.match(policy, /report-uri \/csp-report/)
  assert.doesNotMatch(policy, /report-to/)
  assert.equal(securityHeaders()['Reporting-Endpoints'], undefined)
})

test('production server accepts reports, rejects abuse and logs only sanitized fields', async t => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve-prod.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  })
  t.after(() => child.kill())
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const url = `http://127.0.0.1:${PORT}/csp-report`
  const post = (body, type = 'application/csp-report') => fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body })

  let accepted
  const report = JSON.stringify({ 'csp-report': { 'document-uri': `https://h.test/a?token=${SECRET}`, 'effective-directive': 'script-src-elem', 'blocked-uri': 'inline' } })
  for (let attempt = 0; attempt < 50 && !accepted; attempt += 1) {
    try { accepted = await post(report) }
    catch { await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  assert.equal(accepted?.status, 204)
  assert.equal((await fetch(url)).status, 405)
  assert.equal((await post(report, 'text/plain')).status, 415)
  assert.equal((await post('{not json')).status, 400)
  const oversized = await post(JSON.stringify({ padding: 'x'.repeat(32 * 1024) })).then(response => response.status, () => 'closed')
  assert.ok(oversized === 413 || oversized === 'closed', `unexpected ${oversized}`)
  assert.equal((await post(JSON.stringify({ type: 'csp-violation', body: { effectiveDirective: 'webkit-format' } }))).status, 204)

  await new Promise(resolve => setTimeout(resolve, 100))
  assert.match(output, /"event":"csp-violation"/)
  assert.match(output, /webkit-format/)
  assert.equal(output.includes(SECRET), false)
})
