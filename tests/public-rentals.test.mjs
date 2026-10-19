import assert from 'node:assert/strict'
import test from 'node:test'
import { handlePublicRental, rentalDocument, publicOrigin } from '../scripts/public-rentals.mjs'

const id = '00000000-0000-0000-0000-000000000001'
const post = { id, title: 'Phòng <script>alert(1)</script>', description: 'Yên tĩnh & có bếp', price: 3000000, area: 25, address: 'Khu vực Thủ Đức', type: 1 }
function response() {
  return { status: 0, body: '', headers: {}, writeHead(status, headers = {}) { this.status = status; this.headers = headers }, end(body = '') { this.body = body } }
}
test('public HTML has visible content and canonical, escapes untrusted listing text', () => {
  const html = rentalDocument(post, 'https://homeji.example')
  assert.ok(html.includes(`<link rel="canonical" href="https://homeji.example/rentals/${id}">`))
  assert.ok(html.includes('Yên tĩnh &amp; có bếp'))
  assert.ok(!html.includes('<script>alert'))
  assert.ok(html.includes(`href="/?post=${id}"`))
  assert.equal(publicOrigin('javascript:alert(1)'), null)
  assert.ok(rentalDocument({ ...post, type: 2 }, 'https://homeji.example').includes('cần xác nhận theo phòng hay theo người'))
})
test('private/unavailable API responses return real 404 or 503 and never fake a public listing', async () => {
  for (const status of [404, 500]) {
    const res = response()
    await handlePublicRental({ url: `/rentals/${id}`, method: 'GET' }, res, {
      origin: 'https://homeji.example', apiTarget: 'https://backend.example',
      fetcher: async () => ({ status, ok: false }),
    })
    assert.equal(res.status, status === 404 ? 404 : 503)
    assert.ok(res.body.includes('noindex'))
  }
})
test('HTML is rendered server-side without forwarding user cookies or auth', async () => {
  const res = response()
  let fetched
  await handlePublicRental({ url: `/rentals/${id}?token=secret`, method: 'GET', headers: { authorization: 'private' } }, res, {
    origin: 'https://homeji.example', apiTarget: 'https://backend.example',
    fetcher: async (url, options) => { fetched = { url: url.href, options }; return { ok: true, status: 200, json: async () => post } },
  })
  assert.equal(res.status, 200)
  assert.ok(res.body.includes('<h1>Phòng &lt;script&gt;'))
  assert.ok(!JSON.stringify(fetched).includes('secret'))
  assert.ok(!JSON.stringify(fetched).includes('authorization'))
  assert.equal(res.headers['Cache-Control'], 'no-store')
})
test('sitemap index and pages contain canonical public URLs', async () => {
  for (const path of ['/sitemap.xml', '/sitemaps/rentals-1.xml']) {
    const res = response()
    await handlePublicRental({ url: path, method: 'GET' }, res, {
      origin: 'https://homeji.example', apiTarget: 'https://backend.example',
      fetcher: async () => ({ ok: true, status: 200, json: async () => ({ items: [{ id }], totalPages: 2 }) }),
    })
    assert.equal(res.status, 200)
    assert.ok(res.body.includes(path === '/sitemap.xml' ? 'sitemaps/rentals-2.xml' : `/rentals/${id}`))
  }
})
