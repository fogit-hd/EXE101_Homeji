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

test('product prices, statuses and food actions have readable small-text colors', () => {
  const css = read('ui-consistency.css')
  assert.match(css, /\.marketplace-card__badge, \.marketplace-card__badge.is-mine \{ color: #24543e; \}/)
  assert.match(css, /\.marketplace-card__price \{ color: #24543e; \}/)
  const marketplace = read('pages/MarketplacePage.css')
  for (const variant of ['browse', 'mine']) {
    const rule = marketplace.slice(marketplace.indexOf(`.marketplace-card--${variant} .marketplace-card__price {`)).split('}')[0]
    assert.match(rule, /color: #24543e;/)
  }
  const food = read('components/marketplace/food/FoodMarketplaceView.css')
  assert.match(food, /--food-leaf-deep: #24543e;/)
  assert.match(food, /--food-accent: #a43c22;/)
  assert.ok(!food.includes('#e8603c'), 'food actions and captions must use the corrected accent token')
  assert.ok(!food.includes('#008f46'), 'food prices must use the corrected leaf token')
  for (const surface of ['e7f6ec','ffffff','fffdf8']) assert.ok(contrast('24543e', surface) >= 4.5)
  assert.ok(contrast('a43c22', 'f5f0e6') >= 4.5)
  assert.ok(contrast('fff', 'a43c22') >= 4.5)
  assert.match(food, /\.food-featured__eyebrow\s*\{[^}]*color: #ffd0c2;/)
  assert.ok(contrast('ffd0c2', '14271f') >= 4.5)
})

test('wallet captions and marketplace accent remain readable on their actual surfaces', () => {
  const wallet = read('components/marketplace/wallet/WalletPage.css')
  const header = read('components/marketplace/MarketplaceHeader.css')
  assert.ok(!wallet.includes('#708079'), 'old muted text failed on warm and mint cards')
  assert.match(header, /--mh-accent: #a43c22;/)
  assert.match(wallet, /\.wallet-card__eyebrow\s*\{[^}]*color: #a43c22;/)
  assert.match(wallet, /\.wallet-submit button\s*\{[^}]*background: #a43c22;[^}]*color: #fff;/)
  for (const background of ['ffffff', 'fff7ed', 'ffe6db', 'ddefe4', 'eef2ea']) {
    assert.ok(contrast('526358', background) >= 4.5, `wallet caption on ${background}`)
  }
  for (const background of ['fffdf8', 'fff0e9', 'ffe6db', 'ffffff']) {
    assert.ok(contrast('a43c22', background) >= 4.5, `accent on ${background}`)
  }
  assert.ok(contrast('fff', 'a43c22') >= 4.5)
})

test('review cards reserve content space and stack controls on small screens', () => {
  const css = read('pages/pages.css')
  assert.match(css, /\.admin-item > \.admin-actions\s*\{[^}]*max-width: 40%/)
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
  assert.match(mobile, /\.admin-item\s*\{[^}]*flex-direction: column;[^}]*align-items: stretch;/)
  assert.match(mobile, /\.admin-item > \.admin-actions\s*\{[^}]*flex: none;[^}]*max-width: 100%;/)
})
test('rental owner cards preserve content width and wrap mobile actions without changing notifications', () => {
  assert.match(read('pages/MyPostsPage.tsx'), /className="card notification-item rental-owner-card map-motion-fade-up"/)
  const css = read('pages/pages.css')
  assert.match(css, /\.rental-owner-card > \.notification-item__actions\s*\{[^}]*flex: 0 1 320px;[^}]*max-width: 40%;/)
  assert.match(css, /\.rental-owner-card > div:first-child\s*\{[^}]*overflow-wrap: anywhere;/)
  const mobile = css.slice(css.indexOf('@media (max-width: 768px)'))
  assert.match(mobile, /\.rental-owner-card\s*\{[^}]*flex-direction: column;[^}]*align-items: stretch;/)
  assert.match(mobile, /\.rental-owner-card > \.notification-item__actions\s*\{[^}]*flex: none;[^}]*max-width: 100%;[^}]*justify-content: flex-start;/)
})

test('shared footer is present without route exclusions', () => {
  assert.match(read('components/layout/AppLayout.tsx'), /<SiteFooter compact=/)
})
test('payment plans and waiting screen share the Vietnamese-safe typeface', () => {
  const css = read('ui-consistency.css')
  assert.match(css, /\.payment-page, \.payment-embed, \.payment-wait-page \{ font-family: 'Be Vietnam Pro', sans-serif; \}/)
  assert.match(css, /:is\(\.payment-page, \.payment-embed, \.payment-wait-page\) :is\(h1, h2, h3, strong/)
})

test('payment plan and transaction captions use readable semantic colors', () => {
  const css = read('pages/PaymentPage.css')
  assert.match(css, /--payment-accent: #a43c22;/)
  assert.match(css, /--payment-muted: #526358;/)
  assert.match(css, /--payment-inverse-muted: #d7e3da;/)
  assert.ok(!css.includes('color: #e8603c'), 'old payment eyebrow failed on the warm page')
  assert.ok(!css.includes('var(--hj-accent'), 'payment text and orange cards use the accessible scoped accent')
  for (const oldMuted of ['#777a71', '#7b7f75', '#828579', '#707568', '#9da794']) {
    assert.ok(!css.includes(`color: ${oldMuted}`), `replace low-contrast payment caption ${oldMuted}`)
  }
  assert.match(css, /\.payment-plan-card:is\(\.is-featured, \.is-popular\) \.payment-plan-card__price\s*\{[^}]*color: #fff;/)
  assert.match(css, /\.payment-plan-card:is\(\.is-featured, \.is-popular\) :is\(\.payment-plan-card__total, \.payment-plan-card__savings\)\s*\{[^}]*color: #fff;[^}]*opacity: 1;/)
  assert.match(css, /\.payment-plan-card__price small\s*\{[^}]*opacity: 1;/)
  assert.match(css, /\.payment-plan-card__total,\s*\.payment-plan-card__savings\s*\{[^}]*opacity: 1;/)
  for (const background of ['f3ebdd', 'fffdf9', 'f6f7ef', 'f8f7f2', 'f0efeb']) {
    assert.ok(contrast('526358', background) >= 4.5)
  }
  assert.ok(contrast('fff', 'a43c22') >= 4.5)
  assert.ok(contrast('a43c22', 'f3ebdd') >= 4.5)
  assert.ok(contrast('d7e3da', '24543e') >= 4.5)
})
test('own listings use authenticated inventory instead of public active search', () => {
  assert.ok(/tab === 'sell' \|\| tab === 'mine'[^}]*getMyMarketplacePosts/s.test(read('pages/MarketplacePage.tsx')))
})
test('profile skeleton depends on data, not an animation callback it never emits', () => {
  assert.ok(!read('pages/ProfilePage.tsx').includes('useHomejiLoading(profileLoading)'))
})

test('profile captions, inactive tabs and account badges retain readable colors', () => {
  const css = read('pages/ProfilePage.css')
  for (const selector of ['.profile-page-eyebrow', '.profile-page-lead', '.profile-badge']) {
    const rule = css.slice(css.indexOf(`${selector} {`)).split('}')[0]
    const color = rule.match(/color: #([\da-f]{6});/)?.[1]
    assert.ok(color, `${selector} defines its semantic foreground`)
    assert.ok(contrast(color, selector === '.profile-badge' ? 'eaf0ec' : 'f3ebdd') >= 4.5)
  }
  assert.match(css, /:is\(\.profile-page, \.profile-embed\) \.tab:not\(\.active\)\s*\{[^}]*color: #526358;/)
  for (const [foreground, background] of [['7b530c', 'fff0cd'], ['24543e', 'e4f0e8'], ['9a3b2c', 'fcebe8']]) {
    assert.ok(contrast(foreground, background) >= 4.5)
  }
})

test('roommate cards use readable state colors and remain within narrow grids', () => {
  const css = read('pages/RoommateInvitationsPage.css')
  assert.match(css, /--roommate-accent: #a43c22;/)
  assert.match(css, /--roommate-muted: #526358;/)
  assert.match(css, /minmax\(min\(100%, 280px\), 1fr\)/)
  assert.match(css, /\.roommate-card__top\s*\{[^}]*flex-wrap: wrap;/)
  assert.match(css, /\.roommate-card__date\s*\{[^}]*color: var\(--roommate-muted\);/)
  assert.match(css, /\.roommate-card\.is-accepted \.roommate-card__avatar\s*\{[^}]*background: var\(--roommate-accent\);[^}]*color: #fff;/)
  assert.ok(contrast('fff', 'a43c22') >= 4.5)
  assert.ok(contrast('526358', 'fff9ef') >= 4.5)
  assert.ok(contrast('24382d', 'd8cdbb') >= 4.5)
  assert.ok(contrast('a43c22', 'fce8df') >= 4.5)
  assert.ok(contrast('24543e', 'e4f0e8') >= 4.5)
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

test('wanted-post inputs have associated labels and backend-compatible boundaries', () => {
  const source = read('pages/WantedPostsPage.tsx')
  for (const id of ['wanted-title', 'wanted-description', 'wanted-area', 'wanted-budget', 'wanted-occupants', 'wanted-move-in']) {
    assert.ok(source.includes(`htmlFor="${id}"`))
    assert.ok(source.includes(`id="${id}"`))
  }
  assert.match(source, /id="wanted-title"[\s\S]*?maxLength=\{200\}/)
  assert.match(source, /id="wanted-description"[\s\S]*?maxLength=\{2000\}/)
  assert.match(source, /id="wanted-area"[\s\S]*?maxLength=\{300\}/)
  assert.match(source, /id="wanted-budget"[\s\S]*?min=\{1\}/)
  assert.match(source, /if \(creating\) return/)
  assert.match(source, /finally \{\s*setCreating\(false\)/)
  assert.match(source, /type="submit"[^>]*disabled=\{creating\}/)
})
