import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { GLASS_CANDIDATES, glassControlKind } from '../src/components/ui/glassControlScope.ts'

const kind = html => glassControlKind(new JSDOM(html).window.document.querySelector('[data-test]'))
test('content controls stay solid, including form fields and menu items', () => {
  for (const html of ['<button data-test>Lưu</button>', '<input data-test>', '<select data-test></select>', '<textarea data-test></textarea>', '<input data-test type="checkbox">', '<a data-test role="menuitem">Tài khoản</a>', '<div data-test role="toolbar"></div>', '<button data-test class="post-card">Phòng</button>']) assert.equal(kind(html), 'skip')
  assert.doesNotMatch(GLASS_CANDIDATES, /\bbutton\b|\binput\b|\btextarea\b|\bselect\b/)
})
test('only floating chrome, dialogs, map overlays and standalone lenses get glass', () => {
  for (const css of ['hj-header','mobile-tabbar','choice-picker__panel','hj-account__menu','gmaps-omnibox__dropdown','rental-map__controls','map-detail-panel','app-toast','map-toast','home-list-panel','gmaps-account__popover']) assert.equal(kind(`<div class="${css}" data-test></div>`), 'surface', css)
  assert.equal(kind('<dialog data-test></dialog>'), 'surface')
  assert.equal(kind('<div data-test data-glass-panel></div>'), 'surface')
  assert.equal(kind('<div data-test data-glass-surface></div>'), 'skip')
  assert.equal(kind('<div class="gmaps-omnibox__bar" data-test></div>'), 'search')
  assert.equal(kind('<div class="hj-search__field" data-test></div>'), 'skip')
  assert.equal(kind('<span class="liquid-tabs__lens" data-test></span>'), 'lens')
})
test('vendor maps, explicit exclusions and nested glass stay unpainted', () => {
  for (const wrapper of ['<div class="gm-style">','<gmp-map>','<div data-glass-exclude>']) assert.equal(kind(`${wrapper}<div data-test data-glass-panel></div></div>`), 'skip')
  assert.equal(kind('<div class="hj-header"><button data-test>Lưu</button></div>'), 'skip')
  assert.equal(kind('<div data-glass-panel><span class="liquid-tabs__lens" data-test></span></div>'), 'skip')
  assert.equal(kind('<div data-glass-panel><section data-glass-panel data-test></section></div>'), 'skip')
  assert.equal(kind('<header class="hj-header"><div class="hj-account__menu" data-test></div></header>'), 'surface')
})
test('reclassification preserves native form state', () => {
  const document = new JSDOM('<input type="text" value="giữ dữ liệu">').window.document
  const input = document.querySelector('input')
  assert.equal(glassControlKind(input), 'skip')
  input.setAttribute('data-glass-panel','')
  assert.equal(glassControlKind(input), 'surface')
  input.removeAttribute('data-glass-panel')
  assert.equal(glassControlKind(input), 'skip')
  assert.equal(input.value, 'giữ dữ liệu')
})

test('registration survives missing SVG support and reconciles dynamic exclusions and portals', async () => {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { reactDomModule } = await import('./helpers/react-dom-module.mjs')
  const image = 'data:text/javascript;base64,' + Buffer.from('export default "/lens.png"').toString('base64')
  const overrides = Object.fromEntries(['liquid-lens-map-1.png','liquid-lens-map-stem.png','liquid-lens-map-stem-horizontal.png','liquid-lens-bead-map.png','liquid-lens-bead-map-stem.png','liquid-lens-bead-map-stem-horizontal.png'].map(name => ['./'+name,image]))
  const { LiquidGlassEffects } = await import(reactDomModule('src/components/ui/LiquidGlassEffects.tsx',overrides))
  const dom = new JSDOM('<div id="root"></div><header class="hj-header"><button>Lưu</button><span class="liquid-tabs__lens"></span></header><input value="giữ dữ liệu"><span id="lens" class="liquid-tabs__lens"></span>')
  const preference = { matches: false, addEventListener() {}, removeEventListener() {} }
  const globals = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, matchMedia: () => preference, CSS: { supports: () => false }, ResizeObserver: undefined, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = Object.fromEntries(Object.keys(globals).map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  for (const [key,value] of Object.entries(globals)) Object.defineProperty(globalThis,key,{value,writable:true,configurable:true})
  const root = createRoot(document.querySelector('#root'))
  try {
    await React.act(async () => { root.render(React.createElement(LiquidGlassEffects)) })
    const header = document.querySelector('header')
    assert.ok(header.hasAttribute('data-glass-surface'))
    assert.equal(document.querySelectorAll('[data-glass-control],[data-glass-content]').length,0)
    assert.equal(header.querySelector('[data-glass-registered-lens]'),null)
    assert.ok(document.querySelector('#lens').hasAttribute('data-glass-registered-lens'))
    assert.equal(document.querySelector('#lens').style.getPropertyValue('--glass-lens-filter'),'')
    await React.act(async () => {
      header.setAttribute('data-glass-exclude','')
      const dialog=document.createElement('dialog')
      dialog.id='portal'
      dialog.innerHTML='<button>Đóng</button>'
      document.body.append(dialog)
    })
    assert.ok(!header.hasAttribute('data-glass-surface'))
    assert.ok(document.querySelector('#portal').hasAttribute('data-glass-surface'))
    assert.equal(document.querySelector('input').value,'giữ dữ liệu')
    await React.act(async () => { root.unmount() })
    assert.equal(document.querySelectorAll('[data-glass-surface],[data-glass-registered-lens]').length,0)
  } finally {
    for (const [key,descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor)
      else delete globalThis[key]
    }
    dom.window.close()
  }
})
