import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/components/shell/GlobalHeader.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React },
}).outputText.replace(/^import .*?from ['"].*?['"];?$/gm, '').replace(/^import ['"].*?['"];?$/gm, '')
const bindings = `
import React from '${pathToFileURL(require.resolve('react')).href}';
const useLocation = () => ({ pathname: '/', search: '?section=saved' });
const Link = ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children);
`
const { HeaderLink } = await import(`data:text/javascript;base64,${Buffer.from(bindings + compiled + '\nexport { HeaderLink };').toString('base64')}`)

test('saved and message icons retain meaningful accessible names without adding visible text', () => {
  const saved = renderToStaticMarkup(createElement(HeaderLink, { href: '/?section=saved', label: '', icon: 'heart' }))
  const messages = renderToStaticMarkup(createElement(HeaderLink, { href: '/?section=messages', label: '', icon: 'message', count: 3 }))
  assert.match(saved, /aria-label="Tin đã lưu"/)
  assert.match(messages, /aria-label="Tin nhắn, 3 chưa đọc"/)
  assert.doesNotMatch(saved, /class="hj-action__label"/)
  assert.doesNotMatch(messages, /class="hj-action__label"/)
})
