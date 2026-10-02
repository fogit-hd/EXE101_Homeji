export const trafficPageLabels: Record<string, string> = {
  home: 'Bản đồ tìm phòng', 'rental-detail': 'Chi tiết phòng', explore: 'Khám phá',
  marketplace: 'Chợ đồ', wanted: 'Tin tìm phòng', saved: 'Phòng đã lưu',
  profile: 'Hồ sơ', notifications: 'Thông báo', invitations: 'Ở ghép',
  appointments: 'Lịch xem phòng', messages: 'Tin nhắn', payments: 'Thanh toán',
  'my-posts': 'Tin của tôi', 'create-post': 'Đăng tin', 'edit-post': 'Sửa tin',
  login: 'Đăng nhập', register: 'Đăng ký', privacy: 'Quyền riêng tư', terms: 'Điều khoản', other: 'Trang khác',
}

export function trafficPage(pathname: string, search: string): string | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null
  const query = new URLSearchParams(search)
  if (pathname === '/') {
    if (query.has('post')) return 'rental-detail'
    const section = query.get('section')
    const sections: Record<string, string> = { myPosts: 'my-posts', marketplace: 'marketplace', wanted: 'wanted', saved: 'saved', profile: 'profile', notifications: 'notifications', invitations: 'invitations', appointments: 'appointments', messages: 'messages', payments: 'payments', activities: 'other' }
    return section ? sections[section] ?? 'other' : 'home'
  }
  if (pathname === '/posts/new') return 'create-post'
  if (/^\/posts\/[^/]+\/edit$/.test(pathname)) return 'edit-post'
  if (/^\/posts\/[^/]+$/.test(pathname)) return 'rental-detail'
  const page = pathname.slice(1)
  return Object.hasOwn(trafficPageLabels, page) ? page : 'other'
}

export function trafficSession(previous: { id: string; lastSeen: number } | null, now: number, newId: () => string) {
  const validId = previous && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previous.id)
  return { id: validId && now >= previous.lastSeen && now - previous.lastSeen < 30 * 60_000 ? previous.id : newId(), lastSeen: now }
}
