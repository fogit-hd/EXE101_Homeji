import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { toggleHomejiAi, onHomejiAiToggle, publishHomejiAiOpen } from '../src/lib/homejiAiLauncher.ts'

test('first click survives lazy chat loading and is delivered once', () => {
  const dom = new JSDOM('<button>AI</button>')
  const previous = { window: globalThis.window, CustomEvent: globalThis.CustomEvent }
  globalThis.window = dom.window; globalThis.CustomEvent = dom.window.CustomEvent
  try {
    publishHomejiAiOpen(false)
    toggleHomejiAi(dom.window.document.querySelector('button'), true)
    const requests = []
    const unsubscribe = onHomejiAiToggle(detail => requests.push(detail))
    assert.equal(requests.length, 1)
    assert.equal(requests[0].open, true)
    unsubscribe()
    const again = onHomejiAiToggle(detail => requests.push(detail))
    assert.equal(requests.length, 1)
    again()
  } finally { Object.assign(globalThis, previous); dom.window.close() }
})

test('rapid pre-load toggles retain the latest open/close intent', () => {
  const dom = new JSDOM('')
  const previous = { window: globalThis.window, CustomEvent: globalThis.CustomEvent }
  globalThis.window = dom.window; globalThis.CustomEvent = dom.window.CustomEvent
  try {
    publishHomejiAiOpen(false)
    toggleHomejiAi(null); toggleHomejiAi(null)
    const requests = []
    const unsubscribe = onHomejiAiToggle(detail => requests.push(detail.open))
    assert.deepEqual(requests, [false])
    toggleHomejiAi(null, true)
    assert.deepEqual(requests, [false, true])
    unsubscribe()
  } finally { Object.assign(globalThis, previous); dom.window.close() }
})
