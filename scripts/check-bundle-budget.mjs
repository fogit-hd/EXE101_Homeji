import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const manifest = JSON.parse(await readFile(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8'))
const visited = new Set()
const styles = new Set()
let initialJsBytes = 0
async function visit(key) {
  if (visited.has(key)) return
  visited.add(key)
  const chunk = manifest[key]
  assert.ok(chunk, `Missing manifest entry: ${key}`)
  initialJsBytes += (await stat(new URL(`../dist/${chunk.file}`, import.meta.url))).size
  for (const css of chunk.css ?? []) styles.add(css)
  for (const dependency of chunk.imports ?? []) await visit(dependency)
}
await visit('index.html')
const entry = await readFile(new URL(`../dist/${manifest['index.html'].file}`, import.meta.url))
assert.ok(entry.length < 250_000, `Main entry exceeds 250 kB: ${entry.length} bytes`)
assert.ok(!visited.has('src/pages/ReceiptsPage.tsx'), 'Receipts must remain deferred')
assert.ok(!visited.has('src/pages/ReferralsPage.tsx'), 'Referrals must remain deferred')
assert.ok(![...styles].some(css => /\/(HomePage|auth|post-form|pages)-/.test(css)), 'Page CSS leaked into initial imports')
let initialCssBytes = 0
for (const css of styles) initialCssBytes += (await stat(new URL(`../dist/${css}`, import.meta.url))).size
console.log(JSON.stringify({ entryBytes: entry.length, entryGzipBytes: gzipSync(entry).length, initialJsBytes, initialCssBytes, initialStyles: [...styles] }, null, 2))
