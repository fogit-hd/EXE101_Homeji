export type MarketplaceFilterValue = { category: string; price: string; sort: string; kind: string; status: string }

export const EMPTY_MARKETPLACE_FILTERS: MarketplaceFilterValue = { category: '', price: '', sort: 'default', kind: '', status: '' }
