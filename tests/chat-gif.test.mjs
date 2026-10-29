import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/chatGif.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { parseChatGif } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const body = extra => 'homeji:gif:v1:' + JSON.stringify({ id: 'hello123', ...extra })

test('GIF messages support persisted server casing and keep ordinary chat text intact', () => {
  assert.equal(parseChatGif('Xin chào 😊'), null)
  assert.equal(parseChatGif(body()).id, 'hello123')
  assert.equal(parseChatGif('homeji:gif:v1:' + JSON.stringify({ Id: 'hello123' })).id, 'hello123')
})

test('untrusted GIF payloads cannot inject executable or arbitrary external URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', 'http://media.giphy.com/x', 'https://evil.example/a.gif', 'https://media.giphy.com/media/id/200.gif']) assert.equal(parseChatGif(body({url})), null, url)
  assert.equal(parseChatGif(body({ id: '../evil' })), null)
  assert.equal(parseChatGif('homeji:gif:v1:{bad'), null)
  assert.equal(parseChatGif(body({ id: 'x'.repeat(2000) })), null)
})
