import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'

const require = createRequire(import.meta.url)
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
const mockUrl = dataUrl(`export const useVoiceCalls=()=>({busy:false});export const sendConversationVoice=(...args)=>globalThis.__recorder.send(...args);export const getErrorMessage=(e)=>e.message`)
let source = await readFile(new URL('../src/components/map/VoiceMessageRecorder.tsx', import.meta.url), 'utf8')
for (const name of ['../../api', '../../lib/errors', '../../contexts/voice-call']) source = source.replaceAll(`'${name}'`, JSON.stringify(mockUrl))
source = source.replace("'../../lib/voiceRecording'", JSON.stringify(dataUrl(compile(await readFile(new URL('../src/lib/voiceRecording.ts', import.meta.url), 'utf8')))))
source = compile(source).replaceAll("'react'", JSON.stringify(pathToFileURL(require.resolve('react')).href)).replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href))
const { VoiceMessageRecorder } = await import(dataUrl(source))

async function fixture(media, send = async () => ({ id: 'sent' }), addModule = async () => {}) {
  const dom = new JSDOM('<div id="root"></div>')
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: media } } })
  const contexts = [], nodes = [], sent = [], errors = []
  globalThis.__recorder = { send }
  globalThis.AudioContext = class {
    state = 'running'
    constructor() { contexts.push(this); this.audioWorklet = { addModule } }
    async resume() {}
    async close() { this.state = 'closed' }
    createMediaStreamSource() { return { connect() {}, disconnect() {} } }
  }
  globalThis.AudioWorkletNode = class {
    port = { postMessage: () => { this.port.onmessage?.({ data: { stopped: true } }) } }
    constructor() { nodes.push(this) }
    connect() {} disconnect() {}
  }
  const root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(VoiceMessageRecorder, { conversationId: 'A', disabled: false, onSent: message => sent.push(message), onError: error => errors.push(error) })))
  return { contexts, nodes, sent, errors,
    click: async label => act(async () => [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label || b.textContent === label).click()),
    sample: async () => act(async () => nodes[0].port.onmessage({ data: { samples: new Int16Array(16000).buffer } })),
    close: async () => { await act(async () => root.unmount()); dom.window.close() },
  }
}
const local = () => { const track = { stopped: false, stop() { this.stopped = true } }; return { track, stream: { getTracks: () => [track] } } }

test('cancel while permission is pending closes audio context and stops a late microphone stream', async () => {
  let resolve; const mic = local(), f = await fixture(() => new Promise(done => { resolve = done }))
  try {
    await f.click('Ghi âm tin nhắn'); await f.click('Hủy')
    assert.equal(f.contexts[0].state, 'closed')
    await act(async () => resolve(mic.stream))
    assert.equal(mic.track.stopped, true); assert.equal(f.nodes.length, 0)
  } finally { await f.close() }
})

test('cancel while the worklet script is loading releases the microphone immediately', async () => {
  let resolve; const mic = local(), f = await fixture(async () => mic.stream, undefined, () => new Promise(done => { resolve = done }))
  try {
    await f.click('Ghi âm tin nhắn'); assert.equal(mic.track.stopped, false)
    await f.click('Hủy'); assert.equal(mic.track.stopped, true)
    await act(async () => resolve()); assert.equal(f.nodes.length, 0)
  } finally { await f.close() }
})

test('record, preview and send releases the microphone before upload; switching thread ignores a late response', async () => {
  let resolve; const mic = local(), f = await fixture(async () => mic.stream, () => new Promise(done => { resolve = done }))
  await f.click('Ghi âm tin nhắn'); await f.sample(); await f.click('Dừng ghi')
  assert.equal(mic.track.stopped, true); assert.equal(f.contexts[0].state, 'closed')
  assert.match(document.body.textContent, /Nghe lại trước khi gửi/)
  await f.click('Gửi âm thoại'); await f.close()
  await act(async () => resolve({ id: 'late' }))
  assert.equal(f.sent.length, 0)
})

test('failed upload keeps the preview for retry and successful upload delivers exactly one message', async () => {
  let attempt = 0; const mic = local(), f = await fixture(async () => mic.stream, async () => { if (++attempt === 1) throw new Error('Offline'); return { id: 'sent' } })
  try {
    await f.click('Ghi âm tin nhắn'); await f.sample(); await f.click('Dừng ghi'); await f.click('Gửi âm thoại')
    assert.deepEqual(f.errors, ['Offline']); assert.match(document.body.textContent, /Nghe lại/)
    await f.click('Gửi âm thoại'); assert.deepEqual(f.sent, [{ id: 'sent' }])
    assert.ok(document.querySelector('[aria-label="Ghi âm tin nhắn"]'))
  } finally { await f.close() }
})
