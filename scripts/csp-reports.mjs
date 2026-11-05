export const CSP_REPORT_PATH = '/csp-report'

const MAX_BODY_BYTES = 16 * 1024
const MAX_LOGGED_PER_WINDOW = 60
const WINDOW_MS = 60_000
const MAX_VALUE_LENGTH = 200
const REPORT_CONTENT_TYPE = 'application/csp-report'

function text(value) {
  if (typeof value !== 'string') return undefined
  // Values are attacker-controlled: keep each report on one log line.
  return value.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '').slice(0, MAX_VALUE_LENGTH)
}

/** Query strings and fragments can hold reset tokens and API keys, so only the location is logged. */
export function sanitizeReportUrl(value) {
  const raw = text(value)
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'wss:' && url.protocol !== 'ws:') return url.protocol.slice(0, -1)
    return `${url.origin}${url.pathname}`.slice(0, MAX_VALUE_LENGTH)
  } catch {
    // Browsers also report keywords such as "inline", "eval" and "wasm-eval".
    return /^[a-z-]+$/.test(raw) ? raw : 'invalid'
  }
}

function number(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

function normalizeOne(fields) {
  return {
    document: sanitizeReportUrl(fields.documentURL ?? fields['document-uri']),
    directive: text(fields.effectiveDirective ?? fields['effective-directive'] ?? fields['violated-directive']),
    blocked: sanitizeReportUrl(fields.blockedURL ?? fields['blocked-uri']),
    source: sanitizeReportUrl(fields.sourceFile ?? fields['source-file']),
    line: number(fields.lineNumber ?? fields['line-number']),
    disposition: text(fields.disposition),
  }
}

/** Chromium posts { "csp-report": fields }; WebKit posts { type: "csp-violation", body: fields } to the same directive. */
export function normalizeReports(payload) {
  const fields = payload?.['csp-report'] ?? (payload?.type === 'csp-violation' ? payload.body : null)
  return fields && typeof fields === 'object' && !Array.isArray(fields) ? [normalizeOne(fields)] : []
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) { reject(new RangeError('Report too large')); return }
      chunks.push(chunk)
    })
    req.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.once('error', reject)
    req.once('aborted', () => reject(new Error('Report aborted')))
  })
}

/** Anyone can post here, so the log volume is capped per process, not per client. */
export function createReportLog({ write = line => console.warn(line), now = Date.now } = {}) {
  let windowStart = now()
  let logged = 0
  let dropped = 0
  return report => {
    if (now() - windowStart >= WINDOW_MS) {
      if (dropped > 0) write(JSON.stringify({ event: 'csp-violations-dropped', count: dropped }))
      windowStart = now()
      logged = 0
      dropped = 0
    }
    if (logged >= MAX_LOGGED_PER_WINDOW) { dropped += 1; return }
    logged += 1
    write(JSON.stringify({ event: 'csp-violation', ...report }))
  }
}

function respond(res, status, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers })
  res.end()
}

export async function handleCspReport(req, res, log) {
  if (req.method !== 'POST') { respond(res, 405, { Allow: 'POST' }); return }
  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (contentType !== REPORT_CONTENT_TYPE) { respond(res, 415); return }
  try {
    const payload = JSON.parse(await readBody(req))
    normalizeReports(payload).forEach(log)
    respond(res, 204)
  } catch (error) {
    if (res.destroyed) return
    respond(res, error instanceof RangeError ? 413 : 400, { Connection: 'close' })
    if (error instanceof RangeError) req.destroy()
  }
}
