import assert from 'node:assert/strict'
import test from 'node:test'
import { memberWantedDescription } from '../src/lib/wantedPostCopy.ts'
import { formatAvailableBalance, formatWalletAmount, formatWalletSigned } from '../src/lib/walletMoney.ts'

test('member descriptions omit the API demo note and preserve the actual request', () => {
  const note = 'Nhu cầu minh họa; không phải yêu cầu thuê thực tế'
  assert.equal(memberWantedDescription(null), '')
  assert.equal(memberWantedDescription(note), '')
  assert.equal(memberWantedDescription(`Cần phòng gần trường.\n${note}.`), 'Cần phòng gần trường.')
  assert.equal(memberWantedDescription('Cần phòng có bếp.'), 'Cần phòng có bếp.')
})

test('wallet displays use the member currency suffix and retain signs and rounding', () => {
  assert.equal(formatAvailableBalance(0), '0 đ')
  assert.equal(formatAvailableBalance(3300), '3.300 đ')
  assert.equal(formatAvailableBalance(-3300), '-3.300 đ')
  assert.equal(formatWalletAmount(3300.6), '3.301 đ')
  assert.equal(formatWalletSigned(-3300), '−3.300 đ')
  assert.equal(formatWalletSigned(3300), '+3.300 đ')
  assert.equal(formatWalletSigned(0), '0 đ')
})
