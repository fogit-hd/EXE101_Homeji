import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('ReferralsPage redesign includes Liquid Glass V2, HUD cards, Share & Claim cards, and perforated tickets', async () => {
  const tsx = await readFile(new URL('../src/pages/ReferralsPage.tsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/pages/ReferralsPage.css', import.meta.url), 'utf8')

  // Hero section and live stats HUD
  assert.match(tsx, /className="referrals-hero"/, 'Must render hero section')
  assert.match(tsx, /className="referrals-hud"/, 'Must render HUD cards')
  assert.match(tsx, /Lượt nhận quà còn lại/, 'Must render remaining gifts metric')
  assert.match(tsx, /Bạn đã mời thành công/, 'Must render successful invites metric')
  assert.match(tsx, /Quà tặng mỗi người/, 'Must render reward per person metric')

  // Share & Claim grid
  assert.match(tsx, /className="referrals-grid"/, 'Must render responsive grid for share and claim')
  assert.match(tsx, /className="referrals-code-panel"/, 'Must render digital monospace code panel')
  assert.match(tsx, /Sao chép link/, 'Must render copy link button')
  assert.match(tsx, /Sao chép mã/, 'Must render copy code button')
  assert.match(tsx, /Hiện mã QR/, 'Must render QR code toggle')
  assert.match(tsx, /zalo\.me\/share/, 'Must include Zalo share shortcut')
  assert.match(tsx, /facebook\.com\/sharer/, 'Must include Facebook share shortcut')

  // 3-step guide & Rewards breakdown
  assert.match(tsx, /3 bước nhận quà cho cả hai/, 'Must render 3-step process guide')
  assert.match(tsx, /Quà của mỗi người/, 'Must render rewards breakdown section')
  assert.match(tsx, /3 VOUCHER/, 'Must highlight 3 food vouchers')
  assert.match(tsx, /1 VOUCHER/, 'Must highlight 1 VIP voucher')

  // Ticket voucher component
  assert.match(tsx, /VoucherTicket/, 'Must use specialized VoucherTicket component')
  assert.match(tsx, /referral-ticket__stub/, 'Must render ticket stub')
  assert.match(tsx, /referral-ticket__notch/, 'Must render perforated ticket notches')

  // FAQ accordion
  assert.match(tsx, /Câu hỏi thường gặp & Quy định/, 'Must include FAQ and terms section')

  // CSS Liquid Glass V2 styling
  assert.match(css, /backdrop-filter:\s*blur\(1[0-9]px\)/, 'Cards must use Liquid Glass optical blur')
  assert.match(css, /referrals-hud__card::before[\s\S]*?background:\s*linear-gradient/, 'HUD cards must feature 1px top specular highlight rim')
  assert.match(css, /referrals-card::before[\s\S]*?background:\s*linear-gradient/, 'Main cards must feature 1px top specular highlight rim')
  assert.match(css, /referral-ticket__notch/, 'CSS must style perforated voucher tickets')
  assert.match(css, /html\[data-theme='dark'\]/, 'CSS must support dark mode contrast')
})
