import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

function load(relative, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in imports)) throw Error(`Unexpected import: ${name}`)
    return imports[name]
  }, Intl })
  return exports
}
const types = load('../src/api/types.ts')
const labels = load('../src/lib/labels.ts', { '../api/types': types })
const { getPlanDisplay, sortPlansForDisplay } = load('../src/lib/subscriptionPlanDisplay.ts', {
  '../api/types': types, './labels': labels,
})
const plan = { code: 'PREMIUM_QUARTER', name: 'Premium', tier: 2, price: 275000, durationDays: 90, benefits: [] }

test('catalog price is the payable total for any duration, including non-month multiples', () => {
  for (const durationDays of [7, 30, 90, 150, 365, 400]) {
    const result = getPlanDisplay({ ...plan, durationDays })
    assert.equal(result.headlinePrice, labels.formatPrice(plan.price))
    assert.equal(result.headlineSuffix, `/ ${durationDays} ngày`)
    assert.equal(result.highlightLabel, undefined)
    assert.equal(result.savingsLabel, undefined)
  }
})
test('known legacy benefits are readable while unknown server benefits remain intact', () => {
  const benefits = ['Lưu bài, báo cáo, gửi lời mời roommate', 'Quyền lợi mới từ máy chủ']
  const result = getPlanDisplay({ ...plan, benefits })
  assert.equal(result.benefits[0], 'Lưu tin, báo cáo vi phạm và gửi lời mời ở ghép')
  assert.equal(result.benefits[1], benefits[1])
  assert.equal(benefits[0], 'Lưu bài, báo cáo, gửi lời mời roommate')
})
test('sort follows actual duration and preserves input order rather than code-name guesses', () => {
  const input = [{ ...plan, code: 'YEAR', durationDays: 30 }, { ...plan, code: 'MONTH', durationDays: 7 }, { ...plan, tier: 1, price: 0 }]
  const result = sortPlansForDisplay(input)
  assert.equal(result[0].tier, 1)
  assert.equal(result[1].durationDays, 7)
  assert.equal(input[0].code, 'YEAR')
})
test('zero price does not silently convert a Premium catalog item into Basic', () => {
  const result = getPlanDisplay({ ...plan, price: 0 })
  assert.equal(result.title, 'Premium')
  assert.equal(result.headlineSuffix, '/ 90 ngày')
})

test('duration colors and equivalent price use catalog values without invented savings',()=>{
  assert.equal(getPlanDisplay({...plan,tier:1,price:0}).tone,'free')
  assert.equal(getPlanDisplay({...plan,durationDays:30}).tone,'mint')
  assert.equal(getPlanDisplay({...plan,durationDays:180,price:450000}).tone,'ocean')
  assert.equal(getPlanDisplay({...plan,durationDays:365,price:780000}).tone,'gold')
  assert.equal(getPlanDisplay({...plan,durationDays:180,price:450000}).equivalentPrice,`Khoảng ${labels.formatPrice(75000)} / 30 ngày`)
  assert.equal(getPlanDisplay({...plan,durationDays:0}).equivalentPrice,null)
})
