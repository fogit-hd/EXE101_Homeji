import './MapPremiumEffects.css'

const tagName = 'homeji-map-premium-effect'

/** Register only when a live browser requests an effect; DOM-only tests stay usable. */
function ensureElementRegistered() {
  if (typeof customElements === 'undefined' || customElements.get(tagName)) return
  // Native lifecycle follows Google Maps adding/removing marker DOM nodes.
  class MapPremiumEffectElement extends HTMLElement {
    private generation = 0
    private cleanup?: () => void
  
    connectedCallback() {
      const generation = ++this.generation
      void import('./mapPremiumRenderer').then(({ registerMapPremiumEffect }) => {
        if (!this.isConnected || generation !== this.generation) return
        this.cleanup = registerMapPremiumEffect(this, this.dataset.kind === 'label' ? 'label' : 'cluster')
      }).catch(() => { /* Keep the static marker usable if the effect chunk fails. */ })
    }
  
    disconnectedCallback() {
      this.generation++
      this.cleanup?.()
      this.cleanup = undefined
    }
  }
  customElements.define(tagName, MapPremiumEffectElement)
}

export function createMapPremiumEffect(kind: 'cluster' | 'label'): HTMLElement {
  ensureElementRegistered()
  const element = document.createElement(tagName)
  element.className = 'map-premium-effect'
  element.dataset.kind = kind
  element.setAttribute('aria-hidden', 'true')
  return element
}
