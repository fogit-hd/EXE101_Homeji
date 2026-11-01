import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/games/memoryGameState.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { memoryGameReducer: reduce, newMemoryGame, shuffledMemoryCards, readMemoryBest, saveMemoryBest } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const cards = Array.from({ length: 8 }, (_, index) => ({ id: String(index), kind: index % 4 }))

test('shuffle preserves four distinct pairs with eight unique card IDs', () => {
  for (const random of [() => 0, () => .99999, Math.random]) {
    const shuffled = shuffledMemoryCards(random)
    assert.equal(new Set(shuffled.map(card => card.id)).size, 8)
    for (let kind = 0; kind < 4; kind++) assert.equal(shuffled.filter(card => card.kind === kind).length, 2)
  }
})
test('rapid third picks, duplicate picks and matched cards cannot add moves', () => {
  let state = newMemoryGame(cards)
  state = reduce(state, { type: 'pick', index: 0 })
  assert.equal(reduce(state, { type: 'pick', index: 0 }), state)
  state = reduce(state, { type: 'pick', index: 1 })
  assert.equal(state.moves, 1)
  assert.equal(reduce(state, { type: 'pick', index: 2 }), state)
  state = reduce(state, { type: 'settle' })
  assert.deepEqual(state.shown, [])
  state = reduce(reduce(state, { type: 'pick', index: 0 }), { type: 'pick', index: 4 })
  assert.deepEqual(state.matched, [0, 4])
  assert.equal(reduce(state, { type: 'pick', index: 4 }), state)
  for (const index of [-1, 1.5, 99]) assert.equal(reduce(state, { type: 'pick', index }), state)
})
test('a perfect round takes four moves and restarting clears all progress', () => {
  let state = newMemoryGame(cards)
  for (let kind = 0; kind < 4; kind++) state = reduce(reduce(state, { type: 'pick', index: kind }), { type: 'pick', index: kind + 4 })
  assert.equal(state.moves, 4)
  assert.equal(state.matched.length, 8)
  assert.equal(reduce(state, { type: 'pick', index: 0 }), state)
  state = reduce(state, { type: 'restart', cards })
  assert.equal(state.moves, 0)
  assert.deepEqual(state.matched, [])
})
test('blocked browser storage never prevents play and corrupt records are ignored', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } } })
    assert.equal(readMemoryBest(), null)
    assert.doesNotThrow(() => saveMemoryBest(4))
    for (const value of ['NaN', '-1', '0', '3', 'Infinity', '4.5', null]) {
      globalThis.localStorage.getItem = () => value
      assert.equal(readMemoryBest(), null)
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
