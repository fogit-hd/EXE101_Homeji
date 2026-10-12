import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const compile = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')}`
let source = await readFile(new URL('../src/components/admin/AdminAnalyticsDashboard.tsx', import.meta.url), 'utf8')
source = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } }).outputText
source = source.replace(/^import .*?from ['"](.*?)['"];?$/gm, (line, specifier) => {
  if (specifier === 'react') return line.replace(specifier, pathToFileURL(require.resolve('react')).href)
  return ''
}).replace(/^import ['"].*?['"];?$/gm, '')
let evidenceSource = ''
try { evidenceSource = await readFile(new URL('../src/components/admin/adminPriceEvidence.ts', import.meta.url), 'utf8') }
catch (error) { if (error.code !== 'ENOENT') throw error }
const { AdminAnalyticsDashboard } = await import(compile(`
import React from '${pathToFileURL(require.resolve('react')).href}';
const useGoogleMaps = () => ({ apiKey: '', isLoaded: false });
const isValidCoord = () => true;
const formatPrice = value => 'PRICE[' + value + ']';
const AdminTrafficPanel = () => null;
${evidenceSource}
${source}
`))
const area = { areaName: 'Linh Trung', latitude: 10.85, longitude: 106.8, activeListings: 6,
  medianMonthlyPrice: 3000000, averagePricePerSquareMeter: 150000, totalViews: 220, totalSaves: 10,
  viewingRequests: 2, saveRate: 4.5, demandIndex: 130, priceSignal: 'test_increase',
  recommendation: 'UNSAFE_PRICE_ADVICE', confidence: 'high' }
const render = (metadata = {}) => renderToStaticMarkup(createElement(AdminAnalyticsDashboard, {
  days: 7, onDaysChange() {}, data: { generatedAt: '2026-10-12T00:00:00Z', periodDays: 7,
    trend: [], kpis: { totalUsers: 20, newUsers: 2, newListings: 1, searches: 5,
      listingViews: 220, saves: 10, viewingRequests: 2, saveToViewRate: 4.5,
      viewingRequestToSaveRate: 20, ...area, ...metadata }, areas: [{ ...area, ...metadata }] },
}))

test('legacy mixed-unit analytics cannot display a comparable room price or advice', () => {
  const html = render()
  assert.doesNotMatch(html, /PRICE\[3000000\]|PRICE\[150000\]|UNSAFE_PRICE_ADVICE/)
  assert.match(html, /Chưa có dữ liệu giá đủ điều kiện/)
})

test('room-only samples disclose omissions and independent area sample size', () => {
  const html = render({ priceBasis: 'room_month', priceSampleCount: 4, excludedPriceCount: 2, priceAreaSampleCount: 4 })
  assert.match(html, /PRICE\[3000000\]/)
  assert.match(html, /PRICE\[150000\]/)
  assert.match(html, /4 tin.*2 tin/)
  assert.match(html, /UNSAFE_PRICE_ADVICE/)
})

test('no eligible price or floor-area sample never becomes zero currency or advice', () => {
  const html = render({ priceBasis: 'room_month', priceSampleCount: 0, excludedPriceCount: 6,
    priceAreaSampleCount: 0, medianMonthlyPrice: 0, averagePricePerSquareMeter: 0 })
  assert.doesNotMatch(html, /PRICE\[0\]|UNSAFE_PRICE_ADVICE/)
  assert.match(html, /Chưa có dữ liệu giá đủ điều kiện/)
  const withoutArea = render({ priceBasis: 'room_month', priceSampleCount: 4, excludedPriceCount: 2,
    priceAreaSampleCount: 0, averagePricePerSquareMeter: 0 })
  assert.match(withoutArea, /PRICE\[3000000\]/)
  assert.doesNotMatch(withoutArea, /PRICE\[0\]|UNSAFE_PRICE_ADVICE/)
})

test('inconsistent sample metadata fails closed', () => {
  for (const metadata of [
    { priceSampleCount: 4, excludedPriceCount: 2, priceAreaSampleCount: 5 },
    { priceSampleCount: -1, excludedPriceCount: 7, priceAreaSampleCount: 0 },
    { priceSampleCount: 4, excludedPriceCount: 1, priceAreaSampleCount: 4 },
    { priceSampleCount: 4.5, excludedPriceCount: 1.5, priceAreaSampleCount: 4 },
  ]) assert.doesNotMatch(render({ priceBasis: 'room_month', ...metadata }), /PRICE\[3000000\]|UNSAFE_PRICE_ADVICE/)
})
