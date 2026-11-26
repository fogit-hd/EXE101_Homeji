export const GLASS_SEARCH_SURFACES = '.gmaps-omnibox__bar,.home-map-page .hj-search__field'
export const GLASS_FLOATING_SURFACES = '.hj-header,.mobile-tabbar,.hj-account__menu,.hj-notify__pop,.hj-mega,.choice-picker__panel,.guest-poster-menu__panel,.map-explore__menu,.rental-map__controls,.map-detail-panel,.home-list-panel,.gmaps-nav-rail,.gmaps-nav-drawer,.gmaps-omnibox__notify,.gmaps-omnibox__dropdown,.gmaps-tour,.gmaps-account__popover,.map-explore__panel,.map-place-preview,.toast,.app-toast,.map-toast,dialog,[role="dialog"],[role="alertdialog"],[data-glass-panel]'
const lenses = '.liquid-tabs__lens,.theme-switch__thumb,.liquid-switch__thumb,[data-glass-lens]'
export const GLASS_CANDIDATES = `${lenses},${GLASS_SEARCH_SURFACES},${GLASS_FLOATING_SURFACES}`
export type GlassControlKind = 'lens' | 'search' | 'surface' | 'skip'

/** Glass belongs to floating chrome, never to its children or vendor map UI. */
export function glassControlKind(element: Element): GlassControlKind {
  if (element.closest('.gm-style,gmp-map,[data-glass-exclude]')) return 'skip'
  const parentSurface = element.parentElement?.closest(`${GLASS_FLOATING_SURFACES},${GLASS_SEARCH_SURFACES}`)
  if (element.matches(lenses)) return parentSurface ? 'skip' : 'lens'
  // Menus have their own floating plane even when mounted inside the header.
  if (element.matches(GLASS_FLOATING_SURFACES)) {
    if (parentSurface && !element.matches('dialog,[role="dialog"],[role="alertdialog"],.hj-account__menu,.hj-notify__pop,.hj-mega,.choice-picker__panel,.guest-poster-menu__panel,.map-explore__menu')) return 'skip'
    return 'surface'
  }
  if (element.matches(GLASS_SEARCH_SURFACES)) return parentSurface ? 'skip' : 'search'
  return 'skip'
}

// Retained for the inactive WebGL button renderer. Never used for registration.
export const GLASS_CONTENT_CONTROLS = '.pay-table__row,.map-explore-card,.map-listing-card,.marketplace-card__main,.food-card__media,.food-card__main,.food-kitchen-row,.food-kitchen-card,.marketplace-seller-card,.hj-account__item,.hj-mega__link,[role="menuitem"],[role="option"],.schedule-dt__day,[class*="__card"],[class*="__hit"],[class*="__photo"],[class*="__thumbnail"],[class*="__image"],[class*="__person"],[role="tab"],.food-rail,.food-qty,.food-qty__btn,.food-rail__locate,.food-rail__checkout,.food-rail__clear,.food-rail__remove,.food-cart-fab,.food-cart-sheet'
