import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const readSource = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const stripImports = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
}).outputText.replace(/^import .*?from ['"].*?['"];?$/gm, '').replace(/^import ['"].*?['"];?$/gm, '')
const bindings = `
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from '${pathToFileURL(require.resolve('react')).href}';
const useAuth = () => ({ profile: { role: 3, displayName: 'Quản trị Homeji' } });
const aiFeatureFlags = { adminSummary: true };
const ReportStatus = { Pending: 1 };
const reportStatusLabel = { 1: 'Chờ xử lý' };
const formatPrice = value => String(value);
const getAdminExports = async () => [];
const Link = ({ children, to }) => React.createElement('a', { href: to }, children);
`
const components = await Promise.all([
  'src/components/admin/adminSections.ts',
  'src/components/admin/AdminOperationsSummary.tsx',
  'src/components/ai/AdminAssistant.tsx',
  'src/components/admin/AdminHome.tsx',
].map(async path => stripImports(await readSource(path))))
const { AdminHome } = await import(`data:text/javascript;base64,${Buffer.from(bindings + components.join('\n')).toString('base64')}`)

const stamp = '2026-10-23T03:00:00Z'
const workspace = {
  pendingPosts: [{ id: 'post-1', title: 'Studio có ban công', address: 'Linh Trung', updatedAt: stamp }],
  reports: [{ id: 'report-1', status: 1, targetDisplayName: 'Tin bị báo cáo', reason: 'Giá sai', createdAt: stamp }],
  verifications: [], withdrawals: [],
  counts: { posts: 1, reports: 1, verifications: 0, withdrawals: 0, active: 2 },
  onlineCount: 2, reportStatus: 1, showLoader: false, loadError: '', reload: async () => {}, openTask: () => {},
  aiReview: null, aiAttention: null,
  analytics: null, analyticsError: '', analyticsLoading: true, retryAnalytics: () => {},
}

test('admin home renders one assistant and one work-check entry', () => {
  const html = renderToStaticMarkup(createElement(AdminHome, { ws: workspace }))
  assert.equal((html.match(/Hôm nay có gì cần xử lý\?/g) ?? []).length, 1)
  assert.equal((html.match(/aria-label="Trợ lý điều hành"/g) ?? []).length, 1)
})

test('admin home counts waiting work, links each queue and lists the oldest items first', () => {
  const html = renderToStaticMarkup(createElement(AdminHome, { ws: workspace }))
  assert.match(html, /Có 2 việc đang chờ bạn quyết định\./)
  for (const path of ['/admin/posts', '/admin/reports', '/admin/verifications', '/admin/withdrawals']) assert.match(html, new RegExp(`href="${path}"`))
  assert.match(html, /Studio có ban công/)
  assert.match(html, /Tin bị báo cáo/)
  assert.match(html, /Đã xử lý hết/)
})

test('admin home counts AI-flagged listings as waiting work', () => {
  const html = renderToStaticMarkup(createElement(AdminHome, { ws: { ...workspace, pendingPosts: [], reports: [], counts: { ...workspace.counts, posts: 0, reports: 0 }, aiAttention: 66 } }))
  assert.match(html, /Có 66 việc đang chờ bạn quyết định, gồm 66 tin AI cần người xem lại\./)
  assert.doesNotMatch(html, /Không còn việc nào đang chờ/)
  assert.match(html, /href="\/admin\/ai-reviews"[^>]*>66 tin AI đánh dấu cần người xem lại/)
})

test('admin home says so when nothing is waiting', () => {
  const html = renderToStaticMarkup(createElement(AdminHome, { ws: { ...workspace, pendingPosts: [], reports: [], counts: { ...workspace.counts, posts: 0, reports: 0 } } }))
  assert.match(html, /Không còn việc nào đang chờ/)
  assert.match(html, /Không có mục nào đang chờ\./)
})
