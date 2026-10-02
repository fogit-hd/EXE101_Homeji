import { exploreListUrl, exploreMapUrl } from '../chrome/exploreMode'
import { mapSectionUrl } from '../../lib/mapDeepLinks'
import { resolveMarketplaceDestination, type MarketplaceTab } from '../../lib/marketplaceNavigation'

export type NavGroupId = 'housing' | 'community' | 'market' | 'account'

export type NavIconName =
  | 'home'
  | 'search'
  | 'map'
  | 'bookmark'
  | 'calendar'
  | 'users'
  | 'chat'
  | 'utensils'
  | 'bag'
  | 'list'
  | 'plus'
  | 'receipt'
  | 'wallet'
  | 'card'
  | 'user'
  | 'bell'
  | 'megaphone'
  | 'activity'
  | 'shield'

export type NavigationItem = {
  id: string
  label: string
  href: string
  icon: NavIconName
  group: NavGroupId
  requiredAuth?: boolean
  /** Visual group inside CHỢ HOMEJI. Other menus leave this unset. */
  cluster?: string
}

export type NavigationGroup = {
  id: NavGroupId
  label: string
  items: NavigationItem[]
}

export type ProductPillar = 'explore' | 'roommate' | 'market'

export type SearchModule = 'rooms' | 'goods' | 'food'

export function marketplaceHref(tab: MarketplaceTab, keyword?: string): string {
  const params = new URLSearchParams()
  params.set('section', 'marketplace')
  params.set('market', tab)
  if (tab === 'wallet') params.set('wallet', 'deposit')
  if (keyword) params.set('q', keyword)
  return `/?${params.toString()}`
}

/** Shared category menu. Hrefs are existing map-section and post routes. */
export const navigationGroups: NavigationGroup[] = [
  {
    id: 'housing',
    label: 'NHÀ Ở',
    items: [
      { id: 'home', label: 'Trang chủ', href: '/', icon: 'home', group: 'housing' },
      { id: 'explore', label: 'Khám phá phòng', href: exploreListUrl(), icon: 'search', group: 'housing' },
      { id: 'map', label: 'Bản đồ', href: exploreMapUrl(), icon: 'map', group: 'housing' },
      { id: 'saved', label: 'Đã lưu', href: mapSectionUrl('saved'), icon: 'bookmark', group: 'housing', requiredAuth: true },
      { id: 'appointments', label: 'Lịch xem phòng', href: mapSectionUrl('appointments'), icon: 'calendar', group: 'housing', requiredAuth: true },
    ],
  },
  {
    id: 'community',
    label: 'CỘNG ĐỒNG',
    items: [
      { id: 'roommates', label: 'Ở ghép', href: mapSectionUrl('invitations'), icon: 'users', group: 'community', requiredAuth: true },
      { id: 'messages', label: 'Tin nhắn', href: mapSectionUrl('messages'), icon: 'chat', group: 'community', requiredAuth: true },
    ],
  },
  {
    id: 'market',
    label: 'CHỢ HOMEJI',
    items: [
      { id: 'food', label: 'Đồ ăn', href: marketplaceHref('food'), icon: 'utensils', group: 'market', cluster: 'Mua sắm', requiredAuth: true },
      { id: 'browse', label: 'Chợ đồ', href: marketplaceHref('browse'), icon: 'bag', group: 'market', cluster: 'Mua sắm', requiredAuth: true },
      { id: 'purchases', label: 'Đơn mua', href: marketplaceHref('purchases'), icon: 'receipt', group: 'market', requiredAuth: true },
      { id: 'mine', label: 'Tin của tôi', href: marketplaceHref('mine'), icon: 'list', group: 'market', cluster: 'Quản lý cửa hàng', requiredAuth: true },
      { id: 'sell', label: 'Đăng bán', href: marketplaceHref('sell'), icon: 'plus', group: 'market', cluster: 'Quản lý cửa hàng', requiredAuth: true },
      { id: 'sales', label: 'Đơn bán', href: marketplaceHref('sales'), icon: 'receipt', group: 'market', cluster: 'Quản lý cửa hàng', requiredAuth: true },
      { id: 'wallet', label: 'Số dư', href: marketplaceHref('wallet'), icon: 'wallet', group: 'market', requiredAuth: true },
    ],
  },
  {
    id: 'account',
    label: 'TÀI KHOẢN',
    items: [
      { id: 'subscription', label: 'Gói đăng ký', href: mapSectionUrl('payments'), icon: 'card', group: 'account', requiredAuth: true },
      { id: 'profile', label: 'Hồ sơ', href: mapSectionUrl('profile'), icon: 'user', group: 'account', requiredAuth: true },
    ],
  },
]

export const navigationItems: NavigationItem[] = navigationGroups.flatMap((group) => group.items)

export const PRIMARY_PILLARS: { id: ProductPillar; label: string; href: string }[] = [
  { id: 'explore', label: 'Khám phá phòng', href: exploreListUrl() },
  { id: 'roommate', label: 'Ở ghép', href: mapSectionUrl('invitations') },
  { id: 'market', label: 'Chợ đồ', href: '/?section=marketplace' },
]

const SEARCH_COPY: Record<SearchModule, string> = {
  rooms: 'Tìm khu vực, đường, trường học…',
  goods: 'Tìm sản phẩm…',
  food: 'Tìm món, nguyên liệu hoặc tên bếp…',
}

export function activeProductPillar(pathname: string, search: string): ProductPillar | null {
  if (pathname !== '/') return null
  const params = new URLSearchParams(search)
  const section = params.get('section')
  const post = params.get('post')

  if (section === 'marketplace') return 'market'
  if (section === 'invitations') return 'roommate'
  if (section === 'saved' || section === 'appointments' || section === 'listings' || section === 'explore' || post) {
    return 'explore'
  }
  return null
}

export function isNavigationItemActive(item: NavigationItem, pathname: string, search: string): boolean {
  if (item.id === 'home') {
    if (pathname !== '/') return false
    const params = new URLSearchParams(search)
    return !params.get('section') && !params.get('post')
  }
  if (pathname !== '/' && item.href.startsWith('/?')) return false

  const params = new URLSearchParams(search)
  const section = params.get('section')
  const view = params.get('view')
  const marketTab = section === 'marketplace' ? resolveMarketplaceDestination(params).tab : null
  const post = params.get('post')

  switch (item.id) {
    case 'explore':
      return (section === 'listings' || section === 'explore') && view === 'list' && !post
    case 'map':
      return Boolean(post) || ((section === 'listings' || section === 'explore') && view !== 'list')
    case 'saved':
      return section === 'saved'
    case 'appointments':
      return section === 'appointments'
    case 'roommates':
      return section === 'invitations'
    case 'messages':
      return section === 'messages'
    case 'food':
      return section === 'marketplace' && (marketTab === 'food' || (marketTab == null && !params.get('wallet')))
    case 'browse':
      return section === 'marketplace' && marketTab === 'browse'
    case 'purchases':
      return section === 'marketplace' && marketTab === 'purchases'
    case 'mine':
      return section === 'marketplace' && marketTab === 'mine'
    case 'sell':
      return section === 'marketplace' && marketTab === 'sell'
    case 'sales':
      return section === 'marketplace' && marketTab === 'sales'
    case 'wallet':
      return section === 'marketplace' && marketTab === 'wallet'
    case 'subscription':
      return section === 'payments'
    case 'profile':
      return section === 'profile'
    default:
      return false
  }
}

export function searchModuleFor(pathname: string, search: string): SearchModule {
  if (pathname !== '/') return 'rooms'
  const params = new URLSearchParams(search)
  if (params.get('section') !== 'marketplace') return 'rooms'
  const marketTab = resolveMarketplaceDestination(params).tab
  if (marketTab === 'food' || (marketTab == null && !params.get('wallet'))) return 'food'
  return 'goods'
}

export function searchPlaceholder(module: SearchModule): string {
  return SEARCH_COPY[module]
}

export function searchTarget(module: SearchModule, keyword: string): string {
  const q = keyword.trim()
  if (module === 'food') return marketplaceHref('food', q)
  if (module === 'goods') return marketplaceHref('browse', q)
  const params = new URLSearchParams()
  params.set('section', 'listings')
  params.set('view', 'list')
  if (q) params.set('keyword', q)
  return `/?${params.toString()}`
}
