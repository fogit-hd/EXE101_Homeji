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
const useAuth = () => ({ profile: { role: 3 } });
const usePersistentLoad = () => ({ showLoader: false, error: '', reload: async () => {} });
const aiFeatureFlags = { adminSummary: true };
const ReportStatus = { Pending: 1 };
const reportStatusLabel = { 1: 'Chờ xử lý' };
const PageNotice = () => null;
const ContentSkeleton = () => null;
const AdminAnalyticsSkeleton = () => null;
const PageFrame = ({ children, tabs }) => React.createElement('main', null, tabs, children);
const Link = ({ children }) => React.createElement('a', null, children);
`
const components = await Promise.all([
  'src/components/admin/AdminWorkspaceNav.tsx',
  'src/components/admin/AdminOperationsSummary.tsx',
  'src/components/ai/AdminAssistant.tsx',
  'src/pages/AdminModerationPage.tsx',
].map(async path => stripImports(await readSource(path))))
const { AdminModerationPage } = await import(`data:text/javascript;base64,${Buffer.from(bindings + components.join('\n')).toString('base64')}`)

test('real admin overview renders one assistant and one work-check entry', () => {
  const html = renderToStaticMarkup(createElement(AdminModerationPage))
  assert.equal((html.match(/Hôm nay có gì cần xử lý\?/g) ?? []).length, 1)
  assert.equal((html.match(/aria-label="Trợ lý điều hành"/g) ?? []).length, 1)
})
