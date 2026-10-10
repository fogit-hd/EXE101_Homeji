import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const url = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText).toString('base64')}`
const require = createRequire(import.meta.url)
const cost = url(await readFile(new URL('../src/lib/rentalCost.ts', import.meta.url), 'utf8'))
const source = (await readFile(new URL('../src/components/ai/RentalCostCalculator.tsx', import.meta.url), 'utf8'))
  .replace(/^import .*\r?\n/gm, '')
const bindings = `
import React, { useId, useState } from '${pathToFileURL(require.resolve('react')).href}';
import { calculateRentalCost } from '${cost}';
const formatPrice = value => String(value);
`
const { RentalCostCalculator } = await import(url(bindings + source))

test('real calculator presents unknown listing rent and disables confirmation for zero/invalid source values', () => {
  for (const rent of [0, -1, NaN, Infinity]) {
    const html = renderToStaticMarkup(createElement(RentalCostCalculator, { rent, onConfirmMonthly() {} }))
    assert.match(html, /Tin chưa có giá thuê hợp lệ/)
    assert.match(html, /khoản chưa có thông tin/)
    assert.match(html, /Chưa có đủ thông tin/)
    assert.match(html, /button[^>]*disabled/)
  }
  const valid = renderToStaticMarkup(createElement(RentalCostCalculator, { rent: 3_000_000 }))
  assert.doesNotMatch(valid, /Tin chưa có giá thuê hợp lệ/)
  assert.match(valid, /3000000 đã biết/)
})
