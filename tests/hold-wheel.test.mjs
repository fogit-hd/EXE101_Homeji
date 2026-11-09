import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { reactDomModule } from './helpers/react-dom-module.mjs'

test('a cancelled hold leaves the next room click available', async t => {
  const { window } = new JSDOM('<main></main>')
  Object.assign(globalThis, {
    window, document: window.document, Element: window.Element,
    innerWidth: 800, innerHeight: 600, IS_REACT_ACT_ENVIRONMENT: true,
  })
  const { useHoldWheel } = await import(reactDomModule('src/components/motion/useHoldWheel.ts'))
  const host = document.querySelector('main')
  const root = createRoot(host)
  t.after(() => {
    act(() => root.unmount())
    window.close()
  })

  let clicks = 0
  let holdTimer
  window.setTimeout = callback => { holdTimer = callback; return 1 }
  window.clearTimeout = () => { holdTimer = undefined }

  function RoomCard() {
    const { wheel, bind } = useHoldWheel(() => 'room', 4, () => {})
    return React.createElement('div', { ...bind, 'data-hold-open': Boolean(wheel) },
      React.createElement('button', { onClick: () => clicks++ }, 'Room'))
  }

  act(() => root.render(React.createElement(RoomCard)))
  const button = host.querySelector('button')
  const pointer = type => button.dispatchEvent(new window.PointerEvent(type, {
    bubbles: true, button: 0, isPrimary: true, pointerId: 1, clientX: 350, clientY: 250,
  }))
  const hold = () => {
    act(() => pointer('pointerdown'))
    act(() => holdTimer())
    assert.equal(button.parentElement.dataset.holdOpen, 'true')
  }

  hold()
  act(() => { pointer('pointerup'); button.click() })
  assert.equal(clicks, 0, 'a completed hold still suppresses its click')

  hold()
  act(() => pointer('pointercancel'))
  assert.equal(button.parentElement.dataset.holdOpen, 'false')
  act(() => { pointer('pointerdown'); pointer('pointerup'); button.click() })
  assert.equal(clicks, 1, 'the first independent click opens the room')
})
