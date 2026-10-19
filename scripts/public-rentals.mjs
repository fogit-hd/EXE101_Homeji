const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
export function publicOrigin(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.origin : null
  } catch { return null }
}
export function rentalDocument(post, origin, verification = '') {
  if (!UUID.test(post.id) || typeof post.title !== 'string' || typeof post.description !== 'string'
    || !Number.isFinite(post.price) || post.price <= 0 || !Number.isFinite(post.area)) throw new Error('Invalid public rental')
  const e = escapeHtml
  const canonical = `${origin}/rentals/${post.id}`
  const summary = post.description.replace(/\s+/g, ' ').slice(0, 160)
  // The public API already applies transfer location disclosure; never fetch owner detail APIs here.
  const priceLabel = post.type === 2 ? 'Giá theo tin · cần xác nhận theo phòng hay theo người' : 'Giá thuê cả phòng'
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="origin"><title>${e(post.title)} | Homeji</title><meta name="description" content="${e(summary)}"><link rel="canonical" href="${e(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="${e(post.title)}"><meta property="og:description" content="${e(summary)}"><meta property="og:url" content="${e(canonical)}">${verification}<link rel="stylesheet" href="/public-rental.css"></head><body><main><a href="/">Homeji · Tìm phòng và bạn ở ghép</a><article><h1>${e(post.title)}</h1><p>${e(priceLabel)}: <strong>${e(new Intl.NumberFormat('vi-VN').format(post.price))} đồng/tháng</strong> · ${e(post.area)} m²</p><p>${e(post.address)}</p><div class="description">${e(post.description)}</div><p><a class="action" href="/?post=${encodeURIComponent(post.id)}">Xem phòng trên bản đồ và đặt lịch</a></p><p class="note">Trạng thái và điều kiện thuê cần được xác nhận với chủ tin. Trang công khai không xác nhận giao dịch thuê đã được thực hiện.</p></article><footer><a href="/privacy">Quyền riêng tư</a> · <a href="/terms">Điều khoản</a></footer></main><script type="module" src="/assets/public-rental-analytics.js"></script></body></html>`
}
export function publicErrorDocument(status) {
  const title = status === 404 ? 'Tin không còn công khai' : 'Chưa thể tải tin phòng'
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${title} | Homeji</title></head><body><main><h1>${title}</h1><p><a href="/">Tìm phòng khác trên Homeji</a></p></main></body></html>`
}
export async function handlePublicRental(req, res, { apiTarget, origin, verification = '', fetcher = fetch }) {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const match = /^\/rentals\/([^/]+)\/?$/.exec(pathname)
  const sitemap = pathname === '/sitemap.xml' || /^\/sitemaps\/rentals-\d+\.xml$/.test(pathname)
  if (!match && !sitemap && pathname !== '/robots.txt') return false
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return true }
  const send = (status, type, body) => {
    res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : body)
  }
  if (pathname === '/robots.txt') {
    send(200, 'text/plain', `User-agent: *\nDisallow: /admin\nDisallow: /auth/\nDisallow: /reset-password\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`)
    return true
  }
  if (!origin) { send(503, 'text/html', publicErrorDocument(503)); return true }
  if (match && !UUID.test(match[1])) { send(404, 'text/html', publicErrorDocument(404)); return true }
  try {
    const page = /^\/sitemaps\/rentals-(\d+)\.xml$/.exec(pathname)?.[1] ?? '1'
    const apiPath = match ? `/api/public/rentals/${match[1]}` : `/api/public/rentals/sitemap?page=${page}`
    const response = await fetcher(new URL(apiPath, apiTarget), { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' }, redirect: 'error' })
    if (response.status === 404) { send(404, 'text/html', publicErrorDocument(404)); return true }
    if (!response.ok) throw new Error('Public API unavailable')
    const data = await response.json()
    if (match) send(200, 'text/html', rentalDocument(data, origin, verification))
    else if (pathname === '/sitemap.xml') {
      if (!Number.isInteger(data.totalPages) || data.totalPages < 1 || data.totalPages > 50_000) throw new Error('Invalid sitemap')
      send(200, 'application/xml', `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({ length: data.totalPages }, (_, i) => `<sitemap><loc>${escapeHtml(origin)}/sitemaps/rentals-${i + 1}.xml</loc></sitemap>`).join('')}</sitemapindex>`)
    } else {
      if (!Array.isArray(data.items) || Number(page) > data.totalPages) { send(404, 'text/html', publicErrorDocument(404)); return true }
      const entries = data.items.filter(item => UUID.test(item.id)).map(item => `<url><loc>${escapeHtml(origin)}/rentals/${item.id}</loc></url>`).join('')
      send(200, 'application/xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`)
    }
  } catch { send(503, 'text/html', publicErrorDocument(503)) }
  return true
}
