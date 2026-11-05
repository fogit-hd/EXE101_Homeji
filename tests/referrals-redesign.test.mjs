import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const tsx = await readFile(new URL('../src/pages/ReferralsPage.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/pages/ReferralsPage.css', import.meta.url), 'utf8')

test('the referral page keeps every way to share and claim an invite', () => {
  for (const label of ['Sao chép link', 'Sao chép mã', 'Hiện mã QR', 'Tạo link mời', 'Nhận quà', 'Voucher của bạn', 'Cách nhận quà', 'Mỗi người nhận được', 'Thể lệ']) {
    assert.ok(tsx.includes(label), `Missing: ${label}`)
  }
  assert.match(tsx, /zalo\.me\/share/)
  assert.match(tsx, /facebook\.com\/sharer/)
  assert.match(tsx, /state=\{\{ from: returnTo \}\}/, 'Guests must come back to the invite after signing in')
})

test('the promotion leads with a clear offer and call to action', () => {
  assert.match(tsx, /className="referrals-hero"/)
  assert.match(tsx, /Có bạn, có nhà\./)
  assert.match(tsx, /className="referrals-hero__cta"/)
  assert.match(tsx, /href="#referrals-action"/)
  assert.match(tsx, /id="referrals-action"/)
})

test('promotional copy only promises what the product does', () => {
  for (const phrase of [/\bVIP\b/, /Huy hiệu/, /Ưu tiên nhận thông báo/, /vào ví/]) assert.doesNotMatch(tsx, phrase)
})

test('hero motion respects reduced motion and the rest follows theme tokens', () => {
  assert.match(css, /@keyframes referrals-ticket-in/)
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.referrals-ticket \{ animation: none; \}/)
  const belowHero = css.slice(css.indexOf('#referrals-action'))
  assert.deepEqual(belowHero.match(/#[0-9a-fA-F]{3,8}\b/g), ['#fff'], 'Below the hero only the QR code keeps a fixed color')
})
