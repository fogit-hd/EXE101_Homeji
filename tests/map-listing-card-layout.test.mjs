import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const component = readFileSync(new URL('../src/components/MapListingCard.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/components/MapListingCard.css', import.meta.url), 'utf8')

test('listing thumbnails keep a fixed aspect ratio without stretching', () => {
  assert.match(styles, /\.map-listing-card-image\s*\{[^}]*height:\s*auto;[^}]*aspect-ratio:\s*1;/s)
  assert.match(styles, /\.map-listing-card-image img\s*\{[^}]*object-fit:\s*cover;/s)
})

test('listing badge is top-left and price starts the text body', () => {
  assert.match(component, /post\.isOwnerPremium === true \? <PremiumBadge/)
  assert.match(styles, /\.map-listing-card-image > \.premium-badge\s*\{[^}]*top:\s*8px;[^}]*left:\s*8px;/s)
  assert.match(component, /className="map-listing-card-body">\s*<p className="map-listing-card-price">/)
  assert.match(styles, /\.map-listing-card-price\s*\{[^}]*position:\s*static;/s)
})
