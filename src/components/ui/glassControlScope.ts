export const GLASS_SEARCH_SURFACES = '.hj-search__field,.gmaps-omnibox__bar,.map-messages__inbox-search,.map-messages__search-bar,.choice-picker__search-wrap'
const panels = '.choice-picker__panel,.hj-account__menu,.hj-notify__pop,.hj-mega,.guest-poster-menu__panel,.map-explore__menu,[role="toolbar"],[data-glass-panel]'
const actions = 'button,summary,.btn,.liquid-action,.pay-btn,.payment-button,.hj-action,.hj-post-cta,[role="button"],[role="switch"],[role="checkbox"],[role="radio"],[role="menuitem"],a[class*="__cta"],a[class*="__btn"],a[class*="__action"]'
export const GLASS_CONTENT_CONTROLS = '.pay-table__row,.map-explore-card,.map-listing-card,.marketplace-card__main,.food-card__media,.food-card__main,.food-kitchen-row,.food-kitchen-card,.marketplace-seller-card,.hj-account__item,.hj-mega__link,[role="menuitem"],[role="option"],.schedule-dt__day,[class*="__card"],[class*="__hit"],[class*="__photo"],[class*="__thumbnail"],[class*="__image"],[class*="__person"],[role="tab"],.food-rail,.food-qty,.food-qty__btn,.food-rail__locate,.food-rail__checkout,.food-rail__clear,.food-rail__remove,.food-cart-fab,.food-cart-sheet'
const lenses = '.liquid-tabs__lens,.theme-switch__thumb,.liquid-switch__thumb,[data-glass-lens],[data-glass-optics]'
export const GLASS_CANDIDATES = `${lenses},${actions},input,textarea,select,${GLASS_SEARCH_SURFACES},${panels}`
export type GlassControlKind = 'lens' | 'control' | 'search' | 'field' | 'toggle' | 'surface' | 'content' | 'skip'

/** Only appearance is classified here; native form and navigation behavior stays intact. */
export function glassControlKind(element: Element): GlassControlKind {
  if (element.closest('.gm-style,gmp-map,[data-glass-exclude],.food-rail,.food-qty,.food-cart-fab,.food-cart-sheet')) return 'skip'
  if (element.matches(lenses)) return 'lens'
  if (element.matches(GLASS_SEARCH_SURFACES)) return 'search'
  if (element.matches(panels)) return 'surface'
  if (element.matches('input,textarea,select')) {
    if (element.closest(GLASS_SEARCH_SURFACES) || element.matches('[hidden],[aria-hidden="true"],[readonly],input[type="hidden"],input[type="file"],input[type="range"],input[type="color"]')) return 'skip'
    if (element.matches('input[type="checkbox"],input[type="radio"]')) return 'toggle'
    if (element.matches('input[type="button"],input[type="submit"],input[type="reset"]')) return 'control'
    return 'field'
  }
  if (!element.matches(actions)) return 'skip'
  if (element.matches(GLASS_CONTENT_CONTROLS) || (element.textContent?.trim().length ?? 0) > 120
    || element.querySelector('h1,h2,h3,h4,p,article,section,table')) return 'content'
  return 'control'
}
