import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const compileUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')}`
const { buildRentalDraft } = await import(compileUrl(await readFile(new URL('../src/lib/rentalDraft.ts', import.meta.url), 'utf8')))
const typesUrl = compileUrl(await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8'))
const { RentalPostType, UserRole } = await import(typesUrl)
const { rentalPriceBasis } = await import(compileUrl((await readFile(new URL('../src/components/ai/rentalPriceBasis.ts', import.meta.url), 'utf8'))
  .replace('../../api/types', typesUrl)))
const facts = { typeLabel: 'Tìm bạn ở ghép', address: 'Linh Trung', rent: '1500000', area: '25', amenities: [], imageCount: 3 }

test('renter-authored roommate draft preserves source amount explicitly per person', () => {
  const priceBasis = rentalPriceBasis({ type: RentalPostType.RoommateShare, ownerRole: UserRole.Renter })
  const result = buildRentalDraft({ ...facts, priceBasis })
  assert.match(result.title, /1\.500\.000 đ\/người\/tháng/)
  assert.match(result.description, /Chi phí dự kiến: 1\.500\.000 đồng\/người\/tháng/)
  assert.doesNotMatch(result.description, /đồng\/phòng|Tiền thuê:/)
  assert.ok(!result.missing.includes('Đơn vị giá theo người hay cả phòng'))
})

test('landlord legacy roommate and ordinary rental drafts explicitly use whole-room amounts', () => {
  for (const type of [RentalPostType.RoommateShare, RentalPostType.VacantRoom, RentalPostType.RoomTransfer]) {
    const priceBasis = rentalPriceBasis({ type, ownerRole: UserRole.Landlord })
    const result = buildRentalDraft({ ...facts, priceBasis })
    assert.match(result.title, /1\.500\.000 đ\/phòng\/tháng/)
    assert.match(result.description, /Tiền thuê: 1\.500\.000 đồng\/phòng\/tháng/)
    assert.doesNotMatch(result.description, /đồng\/người/)
  }
})

test('missing, unknown or invalid basis preserves amount and asks unit instead of guessing', () => {
  for (const priceBasis of [undefined, 'unknown', 'untrusted', null]) {
    const result = buildRentalDraft({ ...facts, priceBasis })
    assert.match(result.title, /1\.500\.000 đ\/tháng · chưa rõ đơn vị/)
    assert.match(result.description, /chưa xác nhận theo người hay cả phòng/)
    assert.ok(result.missing.includes('Đơn vị giá theo người hay cả phòng'))
    assert.doesNotMatch(result.description, /đồng\/người|đồng\/phòng/)
  }
})

test('unknown roommate author metadata cannot silently choose a whole-room draft', () => {
  const priceBasis = rentalPriceBasis({ type: RentalPostType.RoommateShare })
  assert.equal(priceBasis, 'unknown')
  assert.ok(buildRentalDraft({ ...facts, priceBasis }).missing.includes('Đơn vị giá theo người hay cả phòng'))
})

test('unit declaration never turns missing or zero rent into a fabricated amount', () => {
  for (const priceBasis of ['room', 'person', 'unknown']) {
    for (const rent of ['', '0', '-1', 'Infinity']) {
      const result = buildRentalDraft({ ...facts, priceBasis, rent })
      assert.ok(result.missing.includes('Giá thuê hợp lệ'))
      assert.doesNotMatch(result.title, /đ\//)
      assert.doesNotMatch(result.description, /đồng\//)
    }
  }
})
