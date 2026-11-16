import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import { JSDOM } from 'jsdom'

const source = await readFile(
  new URL('../src/components/landing/scroll/landingScrollControl.ts', import.meta.url),
  'utf8',
)
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText

const { window } = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = window
globalThis.document = window.document
globalThis.HTMLElement = window.HTMLElement

const mod = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)

test('isLandingScrollExcluded skips map and dialog hosts', () => {
  const map = document.createElement('div')
  map.className = 'gm-style'
  const inside = document.createElement('button')
  map.appendChild(inside)
  document.body.appendChild(map)
  assert.equal(mod.isLandingScrollExcluded(inside), true)

  const dialog = document.createElement('dialog')
  const action = document.createElement('button')
  dialog.appendChild(action)
  document.body.appendChild(dialog)
  assert.equal(mod.isLandingScrollExcluded(action), true)

  const plain = document.createElement('button')
  document.body.appendChild(plain)
  assert.equal(mod.isLandingScrollExcluded(plain), false)
})

test('registerLandingScroll pause depth stop/start', () => {
  let stopped = 0
  let started = 0
  mod.registerLandingScroll({
    stop: () => { stopped += 1 },
    start: () => { started += 1 },
    scrollTo: () => {},
    refresh: () => {},
  })
  mod.stopLandingLenis()
  mod.stopLandingLenis()
  assert.equal(stopped, 2)
  mod.startLandingLenis()
  assert.equal(started, 0)
  mod.startLandingLenis()
  assert.equal(started, 1)
  mod.registerLandingScroll(null)
})
