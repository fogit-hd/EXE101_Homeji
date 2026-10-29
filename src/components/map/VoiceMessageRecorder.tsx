import { useCallback, useEffect, useRef, useState } from 'react'
import { sendConversationVoice, type PostMessage } from '../../api'
import { getErrorMessage } from '../../lib/errors'
import { encodeVoiceWav, VOICE_SAMPLE_RATE } from '../../lib/voiceRecording'
import { useVoiceCalls } from '../../contexts/voice-call'

export function VoiceMessageRecorder({ conversationId, disabled, onSent, onError }: {
  conversationId: string; disabled: boolean; onSent: (message: PostMessage) => void; onError: (message: string) => void
}) {
  const { busy } = useVoiceCalls()
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'preview' | 'sending'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [preview, setPreview] = useState('')
  const blob = useRef<Blob | null>(null)
  const pendingContext = useRef<AudioContext | null>(null)
  const pendingStream = useRef<MediaStream | null>(null)
  const uploading = useRef(false)
  const resource = useRef<{ stream: MediaStream; context: AudioContext; source: MediaStreamAudioSourceNode; node: AudioWorkletNode } | null>(null)
  const chunks = useRef<Int16Array[]>([])
  const version = useRef(0)
  const gate = useRef(false)
  const url = useRef('')
  const samples = useRef(0)
  const release = useCallback(() => {
    pendingStream.current?.getTracks().forEach(track => track.stop()); pendingStream.current = null
    const pending = pendingContext.current; pendingContext.current = null
    if (pending && pending.state !== 'closed') void pending.close().catch(() => {})
    const value = resource.current; resource.current = null
    if (value) { value.node.port.onmessage = null; value.node.disconnect(); value.source.disconnect(); value.stream.getTracks().forEach(t => t.stop()); void value.context.close().catch(() => {}) }
  }, [])
  const clear = useCallback(() => {
    version.current++; release(); chunks.current = []; samples.current = 0; blob.current = null; gate.current = false
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = ''; setPreview(''); setSeconds(0); setPhase('idle')
  }, [release])
  useEffect(() => () => { version.current++; release(); if (url.current) URL.revokeObjectURL(url.current) }, [conversationId, release])
  function finish() {
    release()
    try {
      blob.current = encodeVoiceWav(chunks.current); chunks.current = []
      url.current = URL.createObjectURL(blob.current); setPreview(url.current); setPhase('preview')
    } catch (e) { clear(); onError(getErrorMessage(e, 'Không tạo được bản ghi.')) }
  }
  async function start() {
    if (gate.current || disabled || busy) return
    gate.current = true; setPhase('starting'); const current = ++version.current
    let stream: MediaStream | undefined, context: AudioContext | undefined
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ ghi âm. Hãy dùng trình duyệt mới qua HTTPS.')
      // Resume during the click gesture, before awaiting the microphone permission prompt.
      context = new AudioContext(); pendingContext.current = context; await context.resume()
      if (current !== version.current) return
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false })
      if (current !== version.current) { stream.getTracks().forEach(t => t.stop()); if (context.state !== 'closed') await context.close(); return }
      pendingStream.current = stream
      await context.audioWorklet.addModule('/audio/voice-capture.js')
      if (current !== version.current) { stream.getTracks().forEach(t => t.stop()); if (context.state !== 'closed') await context.close(); return }
      const source = context.createMediaStreamSource(stream), node = new AudioWorkletNode(context, 'homeji-voice-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 })
      pendingContext.current = null; pendingStream.current = null; resource.current = { stream, context, source, node }; chunks.current = []; samples.current = 0
      node.port.onmessage = event => {
        if (current !== version.current) return
        if (event.data.samples instanceof ArrayBuffer) {
          const chunk = new Int16Array(event.data.samples); chunks.current.push(chunk); samples.current += chunk.length; setSeconds(Math.floor(samples.current / VOICE_SAMPLE_RATE))
        }
        if (event.data.stopped || event.data.limit) finish()
      }
      // The worklet has silent output, so microphone audio is never played to speakers.
      source.connect(node); node.connect(context.destination); setPhase('recording')
    } catch (e) {
      stream?.getTracks().forEach(t => t.stop()); if (context?.state !== 'closed') void context?.close().catch(() => {})
      if (current === version.current) { clear(); onError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Bạn cần cho phép sử dụng micro để ghi âm.' : getErrorMessage(e, 'Không mở được micro.')) }
    }
  }
  async function send() {
    if (phase !== 'preview' || !blob.current || uploading.current) return
    uploading.current = true
    setPhase('sending'); const current = version.current
    try {
      const message = await sendConversationVoice(conversationId, blob.current)
      if (current === version.current) { clear(); onSent(message) }
    } catch (e) { if (current === version.current) { setPhase('preview'); onError(getErrorMessage(e, 'Chưa gửi được bản ghi. Bạn có thể thử lại.')) } }
    finally { uploading.current = false }
  }
  return <div className={`chat-recorder ${phase !== 'idle' ? 'is-open' : ''}`}>
    {phase === 'idle' ? <button type="button" className="chat-recorder__mic" aria-label="Ghi âm tin nhắn" disabled={disabled || busy} onClick={() => void start()}><svg viewBox="0 0 24 24" aria-hidden><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/></svg></button> : <section className="chat-recorder__panel" aria-label="Ghi âm tin nhắn">
      <strong>{phase === 'starting' ? 'Đang mở micro…' : phase === 'recording' ? '● Đang ghi âm' : phase === 'sending' ? 'Đang gửi âm thoại…' : 'Nghe lại trước khi gửi'}</strong>
      <span role="timer">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} / 2:00</span>
      {preview && <audio controls src={preview} preload="metadata" aria-label="Nghe lại bản ghi" />}
      <div><button type="button" onClick={clear} disabled={phase === 'sending'}>Hủy</button>
        {phase === 'recording' && <button type="button" onClick={() => resource.current?.node.port.postMessage('stop')}>Dừng ghi</button>}
        {phase === 'preview' && <button type="button" onClick={() => void send()}>Gửi âm thoại</button>}
      </div>
    </section>}
  </div>
}
