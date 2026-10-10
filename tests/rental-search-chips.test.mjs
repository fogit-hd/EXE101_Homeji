import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const compileUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')}`
const typesUrl = compileUrl(await readFile(new URL('../src/api/types.ts', import.meta.url), 'utf8'))
const labelsUrl = compileUrl((await readFile(new URL('../src/lib/labels.ts', import.meta.url), 'utf8')).replace('../api/types', typesUrl))
const source = await readFile(new URL('../src/components/ai/rentalSearchChips.ts', import.meta.url), 'utf8')
const chipsUrl = compileUrl(source.replace('../../lib/labels', labelsUrl))
const { buildRentalSearchChips } = await import(chipsUrl)
const { formatListingRent, formatListingArea, formatPrice } = await import(labelsUrl)

test('listing zero and malformed measurements stay unknown while ordinary currency zero remains valid', () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.equal(formatListingRent(value), 'Chưa có thông tin')
    assert.equal(formatListingArea(value), 'Chưa có thông tin')
  }
  assert.equal(formatListingRent(3_000_000), formatPrice(3_000_000))
  assert.equal(formatListingArea(25), '25 m²')
  assert.notEqual(formatPrice(0), 'Chưa có thông tin')
})
const base = { location: 'Thủ Đức', keyword: null, priceMin: 2_000_000, priceMax: 4_000_000,
  areaMin: 20, areaMax: 35, occupants: 2, budgetBasis: 'rent', criteria: ['WIFI'],
  requiredAmenities: ['KITCHEN'], excludedAmenities: ['AIR_CONDITIONER'], excludeRoommateShare: true }

test('editing location produces a refinement, never the backend full-reset command', () => {
  const chips = buildRentalSearchChips(base)
  const edit = chips.find(chip => chip.text === 'Thủ Đức').edit
  assert.equal(edit + 'Quận 9', 'Đổi khu vực sang Quận 9')
  assert.doesNotMatch(edit.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(), /tim lai|bat dau lai/)
  assert.equal(chips.length, 10)
  assert.ok(chips.some(chip => chip.text === '2 người'))
  assert.ok(chips.some(chip => chip.text === 'Không ở ghép'))
  assert.ok(chips.some(chip => chip.text.startsWith('Cần ')))
  assert.ok(chips.some(chip => chip.text.startsWith('Không có ')))
  assert.deepEqual(base.requiredAmenities, ['KITCHEN'])
  assert.equal(base.priceMax, 4_000_000)
})

test('cleared constraints disappear from chips without retaining the previous search', () => {
  buildRentalSearchChips(base)
  const cleared = { ...base, location: null, priceMin: null, priceMax: null, areaMin: null, areaMax: null,
    occupants: null, requiredAmenities: [], excludedAmenities: [], criteria: [], excludeRoommateShare: false }
  assert.deepEqual(buildRentalSearchChips(cleared), [])
})

test('hard, soft and exclusion refinements retain their distinct visible meaning', () => {
  const chips = buildRentalSearchChips(base)
  assert.equal(chips.find(chip => chip.text.startsWith('Cần ')).edit, 'Không cần Bếp')
  assert.equal(chips.find(chip => chip.text.startsWith('Ưu tiên ')).edit, 'Không cần Wifi')
  assert.equal(chips.find(chip => chip.text.startsWith('Không có ')).edit, 'Không cần Máy lạnh')
  assert.equal(buildRentalSearchChips({ ...base, budgetBasis: 'total' }).find(chip => chip.text.startsWith('Cả phí')).text.includes('4.000.000'), true)
})

