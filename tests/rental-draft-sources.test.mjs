import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function load(path, removeImports = false) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  if (removeImports) source = source.replace(/^import [^\r\n]*\r?\n/gm, '')
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}
const { buildRentalDraft } = await load('../src/lib/rentalDraft.ts')
const { rentalSourceHref } = await load('../src/api/rentalSources.ts', true)
const { rentalSourceFreshness } = await load('../src/lib/rentalSourceFreshness.ts')

test('source expiry remains unknown until checked and never claims room availability', () => {
  const now = Date.parse('2026-10-05T00:00:00Z'), checked = '2026-10-04T00:00:00Z'
  assert.equal(rentalSourceFreshness('2026-09-12T00:00:00Z', checked, now), 'expired')
  assert.equal(rentalSourceFreshness('2026-10-06T00:00:00Z', checked, now), 'notExpired')
  for (const args of [[null, checked], ['bad date', checked], ['2026-09-12T00:00:00Z', null], ['2026-09-12T00:00:00Z', '2026-10-07T00:00:00Z']])
    assert.equal(rentalSourceFreshness(...args, now), 'unknown')
})

test('draft only describes explicit structured facts and reports missing photos and fee units', () => {
  const result = buildRentalDraft({ typeLabel: 'Phòng trống', address: 'Linh Trung, Thủ Đức', rent: '3000000', area: '25', amenities: ['Bếp'], imageCount: 2 })
  assert.match(result.title, /3\.000\.000/)
  assert.match(result.description, /25 m²/)
  assert.match(result.description, /Bếp/)
  assert.doesNotMatch(result.description, /đã xác minh|miễn phí|máy lạnh/)
  assert.ok(result.missing.some(value => value.includes('3 ảnh')))
  assert.ok(result.missing.some(value => value.includes('Đơn vị')))
})

test('blank, zero, negative and nonfinite facts remain unknown, never attractive inferred prices', () => {
  for (const value of ['', '0', '-1', 'Infinity', 'not a number', '1000000001']) {
    const result = buildRentalDraft({ typeLabel: 'Phòng trống', address: '', rent: value, area: '', amenities: [], imageCount: 0 })
    assert.doesNotMatch(result.description, /Tiền thuê:|Diện tích|đã xác minh/)
    assert.ok(result.missing.some(value => value.includes('Giá thuê')))
  }
})

test('untrusted source links cannot inject script, credentials or an unrelated external destination', () => {
  for (const href of ['javascript:alert(1)', 'http://muaban.net/tin', 'https://muaban.net.evil.test', 'https://user:secret@phongtro123.com/tin', '//evil.test', 'not a url']) assert.equal(rentalSourceHref(href), null)
  assert.equal(rentalSourceHref('https://phongtro123.com/tin-phong.html'), 'https://phongtro123.com/tin-phong.html')
  assert.equal(rentalSourceHref('https://muaban.net/bat-dong-san'), 'https://muaban.net/bat-dong-san')
})
