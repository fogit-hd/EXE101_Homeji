// Local-only recovery scenario. Never forwards requests or creates real payments.
import { readFile } from 'node:fs/promises'
let source = await readFile(new URL('./ai-browser-api.mjs', import.meta.url), 'utf8')
source = 'let profileSaved = false;\n' + source
source = source.replace('onboardingCompleted: true', 'onboardingCompleted: false')
const anchor = "if (path === '/__qa/audit') body = audit"
if (!source.includes(anchor)) throw Error('Review fixture adapter: base scenario changed')
source = source.replace(anchor, `if (path === '/api/profile/me') {
    if (request.method === 'PUT') { profileSaved = true; profile.displayName = input.displayName; body = profile }
    else if (!profileSaved) { response.writeHead(404, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ detail: 'UserProfile was not found.' })); return }
    else body = profile
  }
  else if (request.method !== 'GET' && path !== '/api/account/login') {
    response.writeHead(405, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ detail: 'Kiểm thử local: không tạo giao dịch.' })); return
  }
  else if (path === '/api/marketplace-posts') body = [1, 2, 3, 4].map(index => ({
    id: '44444444-4444-4444-8444-44444444444' + index,
    sellerId: '55555555-5555-4555-8555-55555555555' + (index > 2 ? '2' : '1'),
    sellerDisplayName: index > 2 ? 'Quán cơm kiểm thử' : 'Gian hàng kiểm thử',
    title: Number(url.searchParams.get('listingType')) === 1 ? ['Bàn học gỗ', 'Đèn học để bàn', 'Kệ sách nhỏ', 'Ghế văn phòng'][index - 1] : ['Cơm gà xối mỡ', 'Bún thịt nướng kèm rau và nước mắm', 'Cơm sườn trứng', 'Bánh mì thịt'][index - 1],
    description: 'Dữ liệu kiểm thử cục bộ', price: 25000 + index * 5000,
    listingType: Number(url.searchParams.get('listingType')) || 2,
    availableQuantity: index === 4 ? 0 : 10, reservedQuantity: 0, status: 1,
    category: '', condition: 'Còn tốt', address: 'Linh Trung, Thủ Đức', latitude: 10.85,
    longitude: 106.8, distanceKm: null, mediaUrls: [], preparationMinutes: 15,
    unit: 'phần', createdAt: now, updatedAt: now,
  }))
  else if (path === '/api/wallet') body = { userId, balance: 0, totalDeposited: 0, totalSpent: 0, totalEarned: 0, isActivated: false, minimumTopUp: 100000, maximumTopUp: 5000000, minimumWithdrawalReserve: 20000 }
  else if (path === '/api/search-interests') body = { settings: { enabled: false }, suggestions: [], following: [], rooms: [] }
  else if (path === '/api/chatbot/popup-config') body = { enabled: false }
  else if (path === '/__qa/audit') body = audit`)
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
