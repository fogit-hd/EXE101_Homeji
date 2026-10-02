/** Local Figma exports for Chợ đồ ăn (node 26:2263). Do not use remote MCP URLs. */
export const FOOD_ASSETS = {
  featured: '/figma/food/featured.png',
  food1: '/figma/food/food-1.png',
  food2: '/figma/food/food-2.png',
  food3: '/figma/food/food-3.png',
  thumb1: '/figma/food/thumb-1.png',
  thumb2: '/figma/food/thumb-2.png',
  icons: {
    home: '/figma/food/icon-home.svg',
    compass: '/figma/food/icon-compass.svg',
    store: '/figma/food/icon-store.svg',
    users: '/figma/food/icon-users.svg',
    message: '/figma/food/icon-message.svg',
    bell: '/figma/food/icon-bell.svg',
    heart: '/figma/food/icon-heart.svg',
    chefHat: '/figma/food/icon-chef-hat.svg',
    search: '/figma/food/icon-search.svg',
    arrowUpRight: '/figma/food/icon-arrow-up-right.svg',
    clock: '/figma/food/icon-clock.svg',
    minus: '/figma/food/icon-minus.svg',
    plus: '/figma/food/icon-plus.svg',
    shoppingBag: '/figma/food/icon-shopping-bag.svg',
    shoppingBagDark: '/figma/food/icon-shopping-bag-dark.svg',
    locate: '/figma/food/icon-locate.svg',
    mapPin: '/figma/food/icon-map-pin.svg',
    chevronDown: '/figma/food/icon-chevron-down.svg',
    navigation: '/figma/food/icon-navigation.svg',
    x: '/figma/food/icon-x.svg',
    messageSquare: '/figma/food/icon-message-square.svg',
    bike: '/figma/food/icon-bike.svg',
    arrowRight: '/figma/food/icon-arrow-right.svg',
  },
} as const

export type FoodCategoryChip = 'all' | 'viet' | 'veg'
export type FoodQuickFilter = 'fast' | 'available' | 'budget'

export const FOOD_CATEGORY_CHIPS: { id: FoodCategoryChip; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'viet', label: 'Món Việt' },
  { id: 'veg', label: 'Ăn chay' },
]

export const FOOD_QUICK_FILTERS: { id: FoodQuickFilter; label: string }[] = [
  { id: 'fast', label: 'Dưới 30 phút' },
  { id: 'available', label: 'Còn phần' },
  { id: 'budget', label: 'Dưới 60k' },
]

export const VIET_FOOD_CATEGORIES = new Set([
  'Ăn sáng',
  'Cơm nhà',
  'Mì / bún',
  'Ăn vặt',
])

export const ESTIMATED_DELIVERY_FEE = 18_000
