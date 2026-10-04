import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const luminance = (hex) => {
  const full = hex.length === 3 ? [...hex].map(value => value + value).join('') : hex
  const channels = full.match(/\w{2}/g).map(value => Number.parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
test('shared primary buttons retain readable white text in normal and hover states', () => {
  const css = read('ui-consistency.css')
  for (const selector of ['.btn-primary', '.btn-primary:hover:not(:disabled)']) {
    const rule = css.slice(css.indexOf(`${selector} {`)).split('}')[0]
    const background = rule.match(/background: #(\w{6})/)?.[1]
    assert.ok(background)
    assert.match(rule, /color: #fff;/)
    assert.ok(1.05 / (luminance(background) + 0.05) >= 4.5)
  }
})

test('status badges, section captions and map links retain small-text contrast', () => {
  const css = read('ui-consistency.css')
  for (const [selector, background] of [
    ['.badge-gray', 'eaf0ec'], ['.badge-green', '24543e'], ['.badge-blue', 'e3eefa'],
    ['.page-frame__eyebrow', 'f5f0e6'], ['.btn-map-cta', 'fceee6'],
    ['.btn-map-cta:hover:not(:disabled)', 'f8e9ee'],
  ]) {
    const start = css.indexOf(`${selector} {`)
    assert.ok(start >= 0, `${selector} has an explicit semantic correction`)
    const rule = css.slice(start).split('}')[0]
    const color = rule.match(/(?:^|[;{])\s*color: #([\da-f]{3,6});/)?.[1]
    assert.ok(color, `${selector} has a foreground color`)
    assert.ok(contrast(color, background) >= 4.5, `${selector} readable at caption size`)
  }
})
test('home viewing and message panels have equal desktop columns', () => {
  const css = read('components/hub/AuthenticatedHub.css')
  assert.match(css, /\.hub-viewings\s*\{[^}]*grid-column:\s*span 6/)
  assert.match(css, /\.hub-messages\s*\{[^}]*grid-column:\s*span 6/)
})

test('review cards reserve content space and stack controls on small screens', () => {
  const css = read('pages/pages.css')
  assert.match(css, /\.admin-item > \.admin-actions\s*\{[^}]*max-width: 40%/)
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
  assert.match(mobile, /\.admin-item\s*\{[^}]*flex-direction: column;[^}]*align-items: stretch;/)
  assert.match(mobile, /\.admin-item > \.admin-actions\s*\{[^}]*flex: none;[^}]*max-width: 100%;/)
})
test('shared footer is present without route exclusions', () => {
  assert.match(read('components/layout/AppLayout.tsx'), /<SiteFooter compact=/)
})
test('payment plans and waiting screen share the Vietnamese-safe typeface', () => {
  const css = read('ui-consistency.css')
  assert.match(css, /\.payment-page, \.payment-embed, \.payment-wait-page \{ font-family: 'Be Vietnam Pro', sans-serif; \}/)
  assert.match(css, /:is\(\.payment-page, \.payment-embed, \.payment-wait-page\) :is\(h1, h2, h3, strong/)
})
test('own listings use authenticated inventory instead of public active search', () => {
  assert.ok(/tab === 'sell' \|\| tab === 'mine'[^}]*getMyMarketplacePosts/s.test(read('pages/MarketplacePage.tsx')))
})
test('profile skeleton depends on data, not an animation callback it never emits', () => {
  assert.ok(!read('pages/ProfilePage.tsx').includes('useHomejiLoading(profileLoading)'))
})

test('editing the rental address invalidates the previous coordinates', () => {
  assert.match(read('pages/EditRentalPostPage.tsx'), /onChange=\{\(value\) => \{\s*setAddress\(value\)\s*setLatitude\(''\)\s*setLongitude\(''\)/)
})

test('rental coordinates do not interpret empty input as the origin', () => {
  assert.match(read('pages/EditRentalPostPage.tsx'), /latitude\.trim\(\) \? Number\(latitude\) : Number\.NaN/)
})

test('sale price accepts normal VND amounts without a step mismatch', () => {
  const source = read('pages/MarketplacePage.tsx')
  const priceInput = source.match(/<input id="sale-price"[^>]+>/)?.[0]
  assert.ok(priceInput)
  const min = Number(priceInput.match(/min=\{(\d+)\}/)?.[1])
  const step = Number(priceInput.match(/step=\{(\d+)\}/)?.[1])
  for (const price of [18000, 25000, 35000, 200000]) {
    assert.equal((price - min) % step, 0)
  }
})
