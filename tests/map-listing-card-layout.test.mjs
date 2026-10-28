import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const component = readFileSync(new URL('../src/components/MapListingCard.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/components/MapListingCard.css', import.meta.url), 'utf8')

test('listing thumbnails keep a uniform frame without cropping image edges', () => {
  assert.match(styles, /\.map-listing-card-image\s*\{[^}]*width:\s*112px;[^}]*height:\s*104px;/s)
  assert.match(styles, /\.map-listing-card-image img\s*\{[^}]*object-fit:\s*contain;/s)
})

test('listing badge and price use the requested image corners', () => {
  assert.match(component, /post\.isOwnerPremium === true \? <PremiumBadge/)
  const premiumStyles = readFileSync(new URL('../src/components/PremiumBadge.css', import.meta.url), 'utf8')
  assert.match(premiumStyles, /\.map-listing-card-image > \.premium-badge\s*\{[^}]*top:\s*8px;[^}]*right:\s*8px;/s)
  assert.match(styles, /\.map-listing-card-price\s*\{[^}]*bottom:\s*6px;[^}]*right:\s*6px;/s)
})
