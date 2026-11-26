import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const { PremiumBadge } = await import(reactDomModule('src/components/PremiumBadge.tsx'))
const { ListingTrustBadges } = await import(reactDomModule('src/components/ListingTrustBadges.tsx'))
const noop = 'data:text/javascript;base64,' + Buffer.from('export const RentalConsiderationToggle=()=>null').toString('base64')
const { RentalPostCard } = await import(reactDomModule('src/components/RentalPostCard.tsx', { './ai/RentalConsiderationToggle': noop }))
const { MapListingCard } = await import(reactDomModule('src/components/MapListingCard.tsx'))
const { ListingCard } = await import(reactDomModule('src/features/landing-hx/sections/ListingCard.tsx'))

test('PremiumBadge renders localized "Nổi bật" by default without ugly "Premium" text', () => {
  const html = renderToStaticMarkup(React.createElement(PremiumBadge))
  assert.ok(html.includes('premium-badge'), 'Has premium-badge class for styling & contract')
  assert.ok(html.includes('premium-badge--pill'), 'Default variant is pill')
  assert.ok(html.includes('premium-stars'), 'Preserves premium-stars contract')
  assert.ok(html.includes('Nổi bật'), 'Defaults to friendly Vietnamese "Nổi bật"')
  assert.ok(!html.includes('>Premium<'), 'Does not contain raw ugly English text "Premium"')
})

test('PremiumBadge supports custom labels and all icons (rocket, bolt, crown, sparkle, none)', () => {
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

  const none = renderToStaticMarkup(React.createElement(PremiumBadge, {
    label: '✦ Nổi bật',
    icon: 'none',
  }))
  assert.ok(none.includes('✦ Nổi bật'))
  assert.ok(!none.includes('<svg'))
})

test('PremiumBadge handles leading sparkle without duplicate symbols', () => {
  const html = renderToStaticMarkup(React.createElement(PremiumBadge, {
    label: '✦ Nổi bật',
  }))
  assert.ok(html.includes('premium-badge'))
  assert.ok(html.includes('premium-badge__text'))
  assert.ok(!html.includes('✦ ✦'))
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

test("premium content badges retain their variant API on solid surfaces", async () => {
  for (const file of ['PremiumBadge.css', 'ListingTrustBadges.css']) {
    const css=readFileSync(new URL('../src/components/'+file,import.meta.url),'utf8')
    assert.doesNotMatch(css, /backdrop-filter:\s*(?!none)[a-z]+\(/)
    assert.match(css, /background(?:-color)?: var\(--surface-elevated\)/)
  }
  const html=renderToStaticMarkup(React.createElement(ListingTrustBadges,{premium:true,verified:false}))
  assert.ok(html.includes('premium-badge--glass'))
})

test('rental and map cards retain premium badges without BorderBeam', () => {
  const post = {
    id: 'room-1',
    title: 'Phòng trọ cao cấp',
    type: 1,
    price: 4500000,
    area: 28,
    address: 'Thủ Đức, TP.HCM',
    isOwnerPremium: true,
    thumbnailPath: '/thumb.webp',
  }

  const rentalHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(RentalPostCard, { post }))
  )
  assert.ok(!rentalHtml.includes('data-beam'), 'RentalPostCard has no decorative beam')
  assert.ok(rentalHtml.includes('premium-badge--glass'), 'RentalPostCard renders floating frosted glass badge')
  assert.ok(rentalHtml.includes('premium-stars'), 'RentalPostCard retains premium-stars contract')

  const mapHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(MapListingCard, { post }))
  )
  assert.ok(!mapHtml.includes('data-beam'), 'MapListingCard has no decorative beam')
  assert.ok(mapHtml.includes('premium-badge--glass'), 'MapListingCard renders floating frosted glass badge')
  assert.ok(mapHtml.includes('premium-stars'), 'MapListingCard retains premium-stars contract')
})

test('Method 3 & Method 4 Combined: Landing ListingCard renders gold BorderBeam and glass badge when highlighted', () => {
  const listing = {
    id: 'land-1',
    kind: 'room',
    title: 'Phòng mẫu HorizonX',
    price: 5000000,
    area: 35,
    address: 'Linh Trung, Thủ Đức',
    district: 'Thủ Đức',
    tags: ['verified', 'available'],
    image: { src: '/img.webp', srcSmall: '/img-sm.webp', width: 640, height: 480, alt: '' },
    owner: { name: 'Chủ nhà mẫu', role: 'Chủ trọ' },
  }

  const highlightedHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(ListingCard, { listing, highlighted: true }))
  )
  assert.ok(highlightedHtml.includes('data-beam'), 'Highlighted landing card renders BorderBeam')
  assert.ok(highlightedHtml.includes('premium-badge--glass'), 'Highlighted landing card renders frosted glass badge')
  assert.ok(highlightedHtml.includes('Nổi bật'), 'Highlighted landing card displays Nổi bật')

  const plainHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(ListingCard, { listing, highlighted: false }))
  )
  assert.ok(!plainHtml.includes('data-beam'), 'Non-highlighted card does not render BorderBeam')
  assert.ok(!plainHtml.includes('premium-badge--glass'), 'Non-highlighted card does not render badge')
})
