import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { glassControlKind } from '../src/components/ui/glassControlScope.ts'

const kind = html => glassControlKind(new JSDOM(html).window.document.querySelector('[data-test]'))
test('interactive controls, input fields and control surfaces share the material policy', () => {
  for (const html of ['<button data-test>Tiếp tục</button>', '<a data-test class="feature__cta" href="/">Khám phá</a>', '<div data-test role="switch" tabindex="0">Bật</div>']) assert.equal(kind(html), 'control')
  for (const html of ['<input data-test type="email">', '<textarea data-test></textarea>', '<select data-test><option>A</option></select>']) assert.equal(kind(html), 'field')
  assert.equal(kind('<input data-test type="checkbox">'), 'toggle')
  assert.equal(kind('<input data-test type="radio">'), 'toggle')
  assert.equal(kind('<div data-test role="toolbar"><button>Lọc</button></div>'), 'surface')
  assert.equal(kind('<div data-test class="choice-picker__panel"></div>'), 'surface')
  assert.equal(kind('<div data-test data-glass-panel></div>'), 'surface')
  assert.equal(kind('<div data-test data-glass-surface></div>'), 'skip', 'managed output cannot keep a removed panel registered')
})
test('readability and vendor exclusions win over broad registration', () => {
  assert.equal(kind('<div data-glass-exclude><button data-test>Lưu</button></div>'), 'skip')
  assert.equal(kind('<div class="gm-style"><button data-test>Lưu</button></div>'), 'skip')
  assert.equal(kind('<button data-test class="marketplace-card__main"><h3>Ghế đẹp</h3></button>'), 'content')
  assert.equal(kind('<button data-test><p>Thông tin nhiều dòng</p></button>'), 'content')
  assert.equal(kind('<a data-test role="menuitem">Thông tin tài khoản</a>'), 'content')
  for (const type of ['hidden', 'file', 'range', 'color']) assert.equal(kind(`<input data-test type="${type}">`), 'skip')
  assert.equal(kind('<input data-test readonly value="Số dư">'), 'skip')
  assert.equal(kind('<section data-test class="food-rail__cart liquid-surface">Thông tin đơn hàng</section>'), 'skip')
  assert.equal(kind('<div class="hj-search__field"><input data-test></div>'), 'skip')
})
test('a control changing role or becoming excluded is reclassified without losing native state', () => {
  const document = new JSDOM('<input type="checkbox" checked>').window.document
  const input = document.querySelector('input')
  assert.equal(glassControlKind(input), 'toggle')
  input.type = 'text'; input.value = 'giữ dữ liệu'
  assert.equal(glassControlKind(input), 'field')
  input.setAttribute('data-glass-exclude', '')
  assert.equal(glassControlKind(input), 'skip')
  assert.equal(input.value, 'giữ dữ liệu')
})
