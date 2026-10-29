import '../components/PremiumStars.css'

/** DOM equivalent of PremiumStars for Google Maps markers, without a React root per pin. */
export function createPremiumStarsElement(): HTMLSpanElement {
  const root = document.createElement('span')
  root.className = 'premium-stars'
  root.setAttribute('aria-hidden', 'true')
  for (let star = 0; star < 3; star++) {
    const group = document.createElement('span')
    group.className = 'premium-stars__star'
    for (let frame = 0; frame < 4; frame++) {
      const element = document.createElement('i')
      element.className = 'premium-stars__frame'
      group.appendChild(element)
    }
    root.appendChild(group)
  }
  return root
}
