import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { glassControlKind } from '../src/components/ui/glassControlScope.ts'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/components/ui/LiquidSwitch.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
}).outputText.replace(/^import .*?from ['"].*?['"];?$/gm, '').replace(/^import ['"].*?['"];?$/gm, '')
const bindings = `
import React from '${pathToFileURL(require.resolve('react')).href}';
`
const { LiquidSwitch } = await import(`data:text/javascript;base64,${Buffer.from(bindings + compiled).toString('base64')}`)

test('LiquidSwitch renders valid WAI-ARIA switch semantics and convex bead thumb', () => {
  const htmlOff = renderToStaticMarkup(createElement(LiquidSwitch, {
    checked: false,
    'aria-label': 'Bật thông báo',
  }))
  assert.match(htmlOff, /role="switch"/)
  assert.match(htmlOff, /aria-checked="false"/)
  assert.match(htmlOff, /aria-label="Bật thông báo"/)
  assert.match(htmlOff, /class="liquid-switch"/)
  assert.match(htmlOff, /class="liquid-switch__thumb"/)
  assert.match(htmlOff, /data-glass-lens=""/)
  assert.match(htmlOff, /data-glass-profile="bead"/)

  const htmlOn = renderToStaticMarkup(createElement(LiquidSwitch, {
    checked: true,
    'aria-label': 'Bật thông báo',
  }))
  assert.match(htmlOn, /aria-checked="true"/)
  assert.match(htmlOn, /liquid-switch--checked/)
})

test('LiquidSwitch thumb and track classification in glass control scope', () => {
  const dom = new JSDOM(`
    <button class="liquid-switch" role="switch" aria-checked="true">
      <span class="liquid-switch__thumb" data-glass-lens="" data-glass-profile="bead" aria-hidden="true"></span>
    </button>
  `)
  const track = dom.window.document.querySelector('.liquid-switch')
  const thumb = dom.window.document.querySelector('.liquid-switch__thumb')

  assert.equal(glassControlKind(track), 'control', 'Switch button track is classified as control')
  assert.equal(glassControlKind(thumb), 'lens', 'Switch droplet thumb is classified as lens')
})

test('LiquidSwitch disabled state enforces accessibility invariants', () => {
  const htmlDisabled = renderToStaticMarkup(createElement(LiquidSwitch, {
    checked: false,
    disabled: true,
    'aria-label': 'Không thể bật',
  }))
  assert.match(htmlDisabled, /disabled=""/)
  assert.match(htmlDisabled, /aria-disabled="true"/)
  assert.match(htmlDisabled, /liquid-switch--disabled/)
})
