import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

test('street hints type and rotate without changing the query, then stop on focus and reduced motion', async context => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true })
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  let reduced = false
  const listeners = new Set()
  window.matchMedia = () => ({ get matches() { return reduced }, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener) })
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const { useStreetSearchPlaceholder } = await import(reactDomModule(path.resolve('src/hooks/useStreetSearchPlaceholder.ts')))
  function Field({ enabled = true }) { return React.createElement('input', { value: '', readOnly: true, placeholder: useStreetSearchPlaceholder(enabled, 'Tìm kiếm') }) }
  const root = createRoot(document.getElementById('root'))
  try {
    await act(async () => root.render(React.createElement(Field)))
    const hints = new Set()
    for (let i = 0; i < 160; i++) {
      await act(async () => context.mock.timers.tick(65))
      hints.add(document.querySelector('input').placeholder)
      assert.equal(document.querySelector('input').value, '')
    }
    assert.ok(hints.has('Tìm phòng gần Lê Văn Việt'))
    assert.ok(hints.has('Căn hộ gần Đỗ Xuân Hợp'))
    await act(async () => root.render(React.createElement(Field, { enabled: false })))
    await act(async () => context.mock.timers.tick(5000))
    assert.equal(document.querySelector('input').placeholder, 'Tìm kiếm')
    reduced = true
    await act(async () => root.render(React.createElement(Field)))
    assert.equal(document.querySelector('input').placeholder, 'Tìm phòng gần Lê Văn Việt')
    await act(async () => context.mock.timers.tick(5000))
    assert.equal(document.querySelector('input').placeholder, 'Tìm phòng gần Lê Văn Việt')
  } finally {
    await act(async () => root.unmount())
    assert.equal(listeners.size, 0)
    globalThis.window = previous.window; globalThis.document = previous.document; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
    context.mock.timers.reset(); dom.window.close()
  }
})
