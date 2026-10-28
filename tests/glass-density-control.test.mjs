import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/components/ui/GlassDensityControl.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
}).outputText.replace(/^import .*?from ['"].*?['"];?$/gm, '').replace(/^import ['"].*?['"];?$/gm, '')
const bindings = `
import React, { useState, useEffect, useCallback, useRef } from '${pathToFileURL(require.resolve('react')).href}';
`
const { GlassDensityControl, DENSITY_TRANSPARENT, DENSITY_BALANCED, DENSITY_FROSTED } = await import(
  `data:text/javascript;base64,${Buffer.from(bindings + compiled).toString('base64')}`
)

test('GlassDensityControl exports canonical density limits matching reference specification', () => {
  assert.equal(DENSITY_TRANSPARENT, 0.2)
  assert.equal(DENSITY_BALANCED, 0.5)
  assert.equal(DENSITY_FROSTED, 0.85)
})

test('GlassDensityControl renders valid slider semantics, midpoint notch, and reference caption', () => {
  const html = renderToStaticMarkup(createElement(GlassDensityControl, { className: 'glass-density-control--docked' }))
  assert.match(html, /class="glass-density-control glass-density-control--docked"/)
  assert.match(html, /role="slider"/)
  assert.match(html, /aria-valuemin="0.2"/)
  assert.match(html, /aria-valuemax="0.85"/)
  assert.match(html, /aria-valuenow="0.5"/)
  assert.match(html, /aria-valuetext="Cân bằng"/)
  assert.match(html, /class="glass-density-thumb"/)
  assert.match(html, /class="glass-density-dot glass-density-dot--middle"/)
  // Left and right end dots are omitted to cleanly match Apple reference images
  assert.doesNotMatch(html, /glass-density-dot--left/)
  assert.doesNotMatch(html, /glass-density-dot--right/)
  assert.match(html, /độ xuyên thấu cao hơn/)
  assert.match(html, /tăng độ mờ và tương phản/)
})
