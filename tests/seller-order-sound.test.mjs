import test from 'node:test'
import assert from 'node:assert/strict'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const { SellerOrderSound } = await import(reactDomModule('src/lib/sellerOrderSound.ts'))

async function withAudio(run) {
  const saved = new Map(['window', 'AudioContext'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const contexts = []
  let release
  class FakeAudio {
    state = 'suspended'
    hold = false
    fail = false
    constructor() { contexts.push(this) }
    async resume() {
      if (this.fail) throw Error('Audio not allowed')
      if (this.hold) await new Promise(resolve => { release = resolve })
      if (this.state !== 'closed') this.state = 'running'
    }
    async close() { this.state = 'closed' }
  }
  Object.assign(globalThis, { window: { AudioContext: FakeAudio }, AudioContext: FakeAudio })
  try { await run({ contexts, release: () => release() }) }
  finally { for (const [key, value] of saved) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key] } }
}

test('sound is only ready after the browser context is actually running', () => withAudio(async () => {
  const sound = new SellerOrderSound()
  assert.equal(sound.ready, false)
  assert.equal(await sound.arm(), true)
  assert.equal(sound.ready, true)
  sound.mute()
  assert.equal(sound.ready, false)
  assert.equal(sound.play(), false)
  sound.dispose()
}))

test('a delayed resume cannot undo an explicit mute', () => withAudio(async ({ contexts, release }) => {
  const sound = new SellerOrderSound()
  await sound.arm()
  contexts[0].state = 'suspended'; contexts[0].hold = true
  const pending = sound.arm()
  sound.mute(); release()
  assert.equal(await pending, false)
  assert.equal(sound.ready, false)
  assert.equal(sound.play(), false)
  sound.dispose()
}))

test('a pending resume after disposal cannot enable the old context', () => withAudio(async ({ contexts, release }) => {
  const sound = new SellerOrderSound()
  await sound.arm()
  contexts[0].state = 'suspended'; contexts[0].hold = true
  const pending = sound.arm()
  sound.dispose(); release()
  assert.equal(await pending, false)
  assert.equal(sound.ready, false)
  assert.equal(contexts[0].state, 'closed')
}))

test('unsupported and rejected audio never report ready', () => withAudio(async ({ contexts }) => {
  const sound = new SellerOrderSound()
  await sound.arm(); contexts[0].fail = true
  assert.equal(await sound.arm(), false)
  assert.equal(sound.ready, false)
  sound.dispose()
  window.AudioContext = undefined
  assert.equal(await new SellerOrderSound().arm(), false)
}))
