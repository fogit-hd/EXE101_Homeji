import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/voiceRecording.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { encodeVoiceWav } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('WAV preserves PCM samples and reports exact duration without trusting a client duration field', async () => {
  const input = new Int16Array(16000); input[0] = -32768; input[1] = 32767
  const blob = encodeVoiceWav([input.subarray(0, 5000), input.subarray(5000)])
  const view = new DataView(await blob.arrayBuffer())
  assert.equal(blob.type, 'audio/wav'); assert.equal(blob.size, 32044)
  assert.equal(view.getUint32(24, true), 16000); assert.equal(view.getUint32(40, true), 32000)
  assert.equal(view.getInt16(44, true), -32768); assert.equal(view.getInt16(46, true), 32767)
  assert.throws(() => encodeVoiceWav([new Int16Array(4799)]))
  assert.throws(() => encodeVoiceWav([new Int16Array(16000 * 120 + 1)]))
})

test('actual AudioWorklet resamples hardware rates, flushes the tail and enforces a two-minute memory bound', async () => {
  const source = await readFile(new URL('../public/audio/voice-capture.js', import.meta.url), 'utf8')
  for (const rate of [44100, 48000]) {
    const messages = []; let Processor
    vm.runInNewContext(source, { sampleRate: rate, Int16Array, AudioWorkletProcessor: class { port = { postMessage: data => messages.push(data) } }, registerProcessor: (_, type) => { Processor = type } })
    const processor = new Processor()
    for (let i = 0; i < rate; i += 128) processor.process([[new Float32Array(Math.min(128, rate - i)).fill(0.5)]])
    processor.port.onmessage({ data: 'stop' })
    const chunks = messages.filter(m => m.samples).map(m => new Int16Array(m.samples))
    assert.equal(chunks.reduce((n, c) => n + c.length, 0), 16000)
    assert.equal(chunks[0][0], 16384)
    processor.total = 16000 * 120 - 1
    processor.process([[new Float32Array(128)]])
    assert.equal(processor.total, 16000 * 120); assert.ok(messages.some(m => m.limit))
    processor.process([[new Float32Array(128)]])
    assert.equal(processor.total, 16000 * 120)
  }
})

test('call tones stop every scheduled oscillator and release their context on teardown', async () => {
  const source = await readFile(new URL('../src/lib/callTone.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  const { CallTone } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
  const previous = globalThis.AudioContext, nodes = [], contexts = []
  globalThis.AudioContext = class {
    state = 'running'; currentTime = 0; destination = {}
    constructor() { contexts.push(this) }
    async resume() {}
    async close() { this.state = 'closed' }
    createOscillator() { const node = { frequency: {}, connect() {}, disconnect() {}, start(at) { this.startedAt = at }, stop() { this.stopped = true } }; nodes.push(node); return node }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} } }
  }
  const tone = new CallTone()
  try {
    tone.unlock(); tone.start(false); assert.equal(nodes.length, 4)
    assert.deepEqual(nodes.map(node => node.startedAt), [0, 0, .65, .65])
    tone.stop(); assert.ok(nodes.every(node => node.stopped))
    tone.start(true); assert.equal(nodes.length, 8)
    tone.close(); assert.equal(contexts[0].state, 'closed')
  } finally { tone.close(); globalThis.AudioContext = previous }
})
