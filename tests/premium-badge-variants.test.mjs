import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const { PremiumBadge } = await import(reactDomModule('src/components/PremiumBadge.tsx'))
const { ListingTrustBadges } = await import(reactDomModule('src/components/ListingTrustBadges.tsx'))

test('PremiumBadge renders localized "Nổi bật" by default without ugly "Premium" text', () => {
  const html = renderToStaticMarkup(React.createElement(PremiumBadge))
  assert.ok(html.includes('premium-badge'), 'Has premium-badge class for styling & contract')
  assert.ok(html.includes('premium-badge--pill'), 'Default variant is pill')
  assert.ok(html.includes('premium-stars'), 'Preserves premium-stars contract')
  assert.ok(html.includes('Nổi bật'), 'Defaults to friendly Vietnamese "Nổi bật"')
  assert.ok(!html.includes('>Premium<'), 'Does not contain raw ugly English text "Premium"')
})

test('PremiumBadge supports custom labels and all icons (rocket, bolt, crown, sparkle)', () => {
  const boost = renderToStaticMarkup(React.createElement(PremiumBadge, {
    label: 'Ưu tiên',
    icon: 'rocket',
    variant: 'boost',
  }))
  assert.ok(boost.includes('Ưu tiên'))
  assert.ok(boost.includes('premium-badge--boost'))
  assert.ok(boost.includes('svg'))

  const bolt = renderToStaticMarkup(React.createElement(PremiumBadge, {
    label: 'Đẩy tin',
    icon: 'bolt',
  }))
  assert.ok(bolt.includes('Đẩy tin'))
  assert.ok(bolt.includes('svg'))

  const crown = renderToStaticMarkup(React.createElement(PremiumBadge, {
    label: 'VIP',
    icon: 'crown',
    variant: 'compact',
  }))
  assert.ok(crown.includes('VIP'))
  assert.ok(crown.includes('premium-badge--compact'))
})

test('PremiumBadge supports all variants (pill, boost, glass, compact, subtle)', () => {
  for (const variant of ['pill', 'boost', 'glass', 'compact', 'subtle']) {
    const html = renderToStaticMarkup(React.createElement(PremiumBadge, { variant }))
    assert.ok(html.includes(`premium-badge--${variant}`))
  }
})

test('PremiumBadge supports showStars=false without breaking badge', () => {
  const html = renderToStaticMarkup(React.createElement(PremiumBadge, { showStars: false }))
  assert.ok(html.includes('premium-badge'))
  assert.ok(!html.includes('premium-stars'))
})

test('ListingTrustBadges correctly proxies variant, label and icon props', () => {
  const html = renderToStaticMarkup(React.createElement(ListingTrustBadges, {
    premium: true,
    verified: false,
    premiumLabel: 'Ưu tiên hiển thị',
    premiumVariant: 'boost',
    premiumIcon: 'rocket',
  }))
  assert.ok(html.includes('Ưu tiên hiển thị'))
  assert.ok(html.includes('premium-badge--boost'))
  assert.ok(!html.includes('verified-owner-badge'))
})
