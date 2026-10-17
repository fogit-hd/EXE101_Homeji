import fs from 'node:fs/promises'
import assert from 'node:assert/strict'

// Read-only checks: provider-return endpoints only redirect, without settling payments.
const frontend = 'https://homeji.onrender.com'
const backend = 'https://homeji-be.onrender.com'
const output = new URL('../output/verification/domain-migration/', import.meta.url)
const checks = []
await fs.mkdir(output, { recursive: true })

async function probe(url, { expectedStatus = 200, expectedOrigin, ...options } = {}) {
  const response = await fetch(url, {
    ...options, redirect: 'manual', signal: AbortSignal.timeout(25_000),
  })
  const body = await response.text()
  const result = {
    url, status: response.status,
    contentType: response.headers.get('content-type'),
    location: response.headers.get('location'),
    allowOrigin: response.headers.get('access-control-allow-origin'),
  }
  if (url.endsWith('/api/account/google/url') && response.ok) {
    result.googleRedirect = new URL(JSON.parse(body).url).searchParams.get('redirect_to')
    assert.equal(result.googleRedirect, `${frontend}/auth/callback`)
  }
  if (url === `${frontend}/`) result.entry = body.match(/\/assets\/index-[^" ]+\.js/)?.[0]
  checks.push(result)
  console.log(JSON.stringify(result))
  assert.equal(response.status, expectedStatus, url)
  if (expectedStatus === 302) assert.equal(new URL(result.location).origin, frontend)
  if (expectedOrigin !== undefined) assert.equal(result.allowOrigin, expectedOrigin)
  if (expectedStatus === 200 && url.includes('/api/')) assert.match(result.contentType, /application\/json/)
}

try {
  for (const path of ['/', '/login', '/register', '/auth/callback', '/reset-password', '/payments', '/privacy', '/terms', '/api/subscriptions/packages', '/api/rental-posts?take=1', '/api/account/google/url']) {
    await probe(frontend + path)
  }
  await probe(`${frontend}/api/profile/me`, { expectedStatus: 401 })
  for (const path of ['/health/live', '/health/ready', '/api/account/google/url']) await probe(backend + path)
  for (const path of ['/api/payments/momo/return?orderId=DOMAIN_PROBE&resultCode=1006', '/api/payments/payos/return?cancel=true&orderCode=DOMAIN_PROBE', '/api/payments/payos/cancel?orderCode=DOMAIN_PROBE']) {
    await probe(backend + path, { expectedStatus: 302 })
  }
  for (const origin of [frontend, 'https://untrusted.example']) {
    await probe(`${backend}/api/profile/me`, {
      method: 'OPTIONS', expectedStatus: 204,
      expectedOrigin: origin === frontend ? frontend : null,
      headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' },
    })
  }
} finally {
  await fs.writeFile(new URL('http-checks.json', output), JSON.stringify({ verifiedAt: new Date().toISOString(), checks }, null, 2))
}
