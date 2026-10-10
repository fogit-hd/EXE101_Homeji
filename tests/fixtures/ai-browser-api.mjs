// Explicit local UI fixtures, never loaded by the application or deployed API.
import http from 'node:http'
const now = '2026-10-05T00:00:00Z'
const userId = '11111111-1111-4111-8111-111111111111'
const profile = { id: userId, displayName: 'Homeji kiểm thử', role: 3, onboardingCompleted: true, isPremium: false, landlordVerificationStatus: 0 }
const posts = [1, 2, 3].map(index => ({
  id: `22222222-2222-4222-8222-22222222222${index}`, ownerId: userId, type: 1, status: 3,
  title: `Phòng kiểm thử ${index} · Thủ Đức`, description: 'Thông tin local để kiểm thử giao diện.',
  price: 2000000 + index * 500000, deposit: 0, area: 16 + index * 4, address: 'Linh Trung, Thủ Đức',
  latitude: 10.85 + index * .002, longitude: 106.8 + index * .002, maxOccupants: 2, availableSlots: 2,
  amenities: ['KITCHEN', 'WIFI'], media: [], electricityPrice: 0, waterPrice: 0, internetPrice: 0,
  createdAt: now, updatedAt: now, viewCount: 0, saveCount: 0, isOwnerPremium: false, boostScore: 0,
}))
const audit = []
const notificationScenario = process.env.HOMEJI_QA_NOTIFICATIONS === '1'
let notificationFailures = notificationScenario ? 1 : 0
const notifications = notificationScenario ? [1, 2].map(index => ({
  id: `notification-qa-${index}`, userId, title: `Thông báo server QA ${index}`,
  message: 'Thông báo giả lập kiểm tra đánh dấu đã đọc.', type: 1, isRead: false, createdAt: now,
})) : []
const criteria = { location: 'Thủ Đức', keyword: null, priceMin: null, priceMax: 4000000, areaMin: null, areaMax: null, criteria: [], requiredAmenities: ['KITCHEN'], excludedAmenities: [], unknown: [], occupants: 2, budgetBasis: 'rent', excludeRoommateShare: true, destination: null }
const result = { criteria, tag: 'Phù hợp theo dữ liệu tin', mapFocusLatitude: posts[0].latitude, mapFocusLongitude: posts[0].longitude, mapFocusAddress: posts[0].address,
  posts: posts.map(post => ({ post, score: 37, reasons: ['Giá nằm trong ngân sách tối đa.', 'Khớp tiện ích chủ tin khai báo: KITCHEN.'], tag: 'Phù hợp theo dữ liệu tin', updatedAt: now, commercialBoost: 0,
    reasonEvidence: [{ text: 'Giá nằm trong ngân sách tối đa.', postId: post.id, sourceType: 'listing', field: 'price', value: String(post.price) }, { text: 'Khớp tiện ích chủ tin khai báo: KITCHEN.', postId: post.id, sourceType: 'listing', field: 'amenities', value: 'KITCHEN' }], evidence: [] })) }
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  let payload = ''
  for await (const chunk of request) { payload += chunk; if (payload.length > 20000) { response.writeHead(413); response.end(); return } }
  let input = {}
  try { if (payload) input = JSON.parse(payload) } catch { response.writeHead(400); response.end(); return }
  const path = url.pathname
  const queryResult = { ...result, criteria: { ...criteria,
    ...(input.message?.includes('cả phí') || input.text?.includes('cả phí') ? { budgetBasis: 'total', unknown: ['feeUnits'] } : {}),
  } }
  const record = { method: request.method, path }
  if (path.includes('/ai/') || path.includes('/chatbot/messages')) record.previousCriteria = input.previousCriteria ?? null
  audit.push(record)
  let body = []
  if (path === '/__qa/audit') body = audit
  else if (path === '/api/notifications') body = notifications.filter(item => url.searchParams.get('unreadOnly') !== 'true' || !item.isRead)
  else if (request.method === 'POST' && (path === '/api/notifications/read-all' || /^\/api\/notifications\/[^/]+\/read$/.test(path))) {
    if (notificationScenario) await new Promise(resolve => setTimeout(resolve, 1200))
    if (notificationFailures > 0) {
      notificationFailures--
      response.writeHead(400, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ message: 'QA: chưa đánh dấu được; thử lại.' }))
      return
    }
    if (path.endsWith('/read-all')) notifications.forEach(item => { item.isRead = true })
    else { body = notifications.find(item => path.includes(item.id)); if (body) body.isRead = true }
  }
  else if (path === '/api/account/login') body = { accessToken: 'local-ui-fixture-only', userId, email: 'qa-ai@example.test' }
  else if (path === '/api/profile/me') body = profile
  else if (path === '/api/chatbot/popup-config') body = { enabled: true, title: 'Homeji', greeting: 'Trợ lý kiểm thử local', suggestedPrompts: [] }
  else if (path === '/api/ai/highlight-rental-posts') body = queryResult
  else if (path === '/api/chatbot/messages') body = { conversationId: userId, userMessage: { id: 'qa-message', conversationId: userId, sender: 1, content: input.message, createdAt: now }, assistantMessage: { id: 'qa-reply', conversationId: userId, sender: 2, content: 'Xem tiêu chí và xác nhận trước khi áp dụng.', createdAt: now }, searchUpdate: queryResult, actions: [] }
  else if (path === '/api/rental-posts/compare') body = { posts: posts.filter(post => input.postIds?.includes(post.id)).map(post => ({ post, averageRating: 0, reviewCount: 0 })) }
  else if (path === '/api/rental-posts') body = url.searchParams.has('ids') ? posts.filter(post => url.searchParams.getAll('ids').includes(post.id)) : posts
  else if (path === '/api/saved-posts') body = posts
  else if (path === '/api/rental-posts/mine') body = posts
  else if (path.startsWith('/api/rental-posts/')) body = posts.find(post => path.endsWith(post.id)) ?? posts[0]
  else if (path === '/api/rental-source-listings') body = [{ id: userId, source: 'phongtro123', sourceId: 'QA-only', sourceUrl: 'https://phongtro123.com/', title: 'Tin nguồn kiểm thử', address: 'Thủ Đức', district: 'thuduc', price: 0, area: 0, imageUrls: [], sourceUpdatedAt: null, collectedAt: now }]
  else if (path === '/api/admin/moderation/rental-posts/pending') body = posts.slice(0, 1)
  else if (path === '/api/admin/analytics/product') body = { generatedAt: now, periodDays: Number(url.searchParams.get('days') ?? 30), kpis: { totalUsers: 20, newUsers: 3, activeListings: 3, newListings: 3, medianMonthlyPrice: 3000000, averagePricePerSquareMeter: 150000, searches: 30, listingViews: 50, saves: 10, viewingRequests: 3, saveToViewRate: 20, viewingRequestToSaveRate: 30 }, trend: [], areas: [] }
  else if (path === '/api/admin/analytics/traffic') body = { generatedAt: now, periodDays: 30, trackingStartedAt: null, pageViews: 0, sessions: 0, activeSessions: 0, trend: [], topPages: [] }
  else if (path === '/api/subscriptions/me') body = { tier: 1, isPremium: false }
  else if (path.startsWith('/hubs/')) { response.writeHead(503); response.end(); return }
  response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body))
})
server.listen(5490, '127.0.0.1', () => console.log('AI UI fixtures on loopback port 5490. No production credentials or actions.'))
