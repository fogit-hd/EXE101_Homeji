import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { choicePickerModule } from './helpers/choice-picker-module.mjs'

const require = createRequire(import.meta.url)
const source = (await readFile(new URL('../src/components/ai/RentalDecisionPanel.tsx', import.meta.url), 'utf8'))
  .replace(/^import .*\r?\n/gm, '')
const javascript = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React,
} }).outputText
async function render(commute) {
  const bindings = `
    import React, { useEffect, useRef, useState } from '${pathToFileURL(require.resolve('react')).href}';
    import { ChoicePicker } from '${choicePickerModule}';
    const aiFeatureFlags = { commute: ${commute} };
    const AddressAutocomplete = () => null;
    const Link = () => null;
    const formatPrice = String;
    const amenityLabel = String;
    const mapPostUrl = String;
    const getErrorMessage = String;
    const getRentalDecision = () => { throw new Error('SSR must not request comparison'); };
  `
  const { RentalDecisionPanel } = await import(`data:text/javascript;base64,${Buffer.from(bindings + javascript).toString('base64')}`)
  return renderToStaticMarkup(createElement(RentalDecisionPanel, { postIds: ['one'] }))
}

test('merged decision panel keeps cost tools available while Routes rollout is disabled', async () => {
  const html = await render(false)
  assert.match(html, /Đơn vị điện/)
  assert.match(html, /Làm mới so sánh/)
  assert.doesNotMatch(html, /Tính đường đi|Phương tiện|Giờ đi dự kiến/)
})

test('Routes controls are present only when explicitly enabled', async () => {
  assert.match(await render(true), /Tính đường đi tới điểm đến bạn chọn/)
})
