import { CallTone } from '../lib/callTone'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { VoiceCalls } from './voice-call'
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import { apiRequest, getApiBaseUrl, getStoredSession } from '../api/client'
import { ensureFreshSession } from '../api/sessionRefresh'
import { useAuth } from './AuthContext'
import { getErrorMessage } from '../lib/errors'
import './VoiceCallContext.css'

type Call = { id: string; conversationId: string; name: string; incoming: boolean; phase: 'ringing' | 'connecting' | 'connected' }
type Incoming = { callId: string; conversationId: string; callerName: string }

export function VoiceCallProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile } = useAuth()
  const ownerId = isAuthenticated ? profile?.id : undefined
  const [call, setCall] = useState<Call | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const [notice, setNotice] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const tone = useRef<CallTone | null>(null)
  const hub = useRef<HubConnection | null>(null)
  const current = useRef<Call | null>(null)
  const peer = useRef<RTCPeerConnection | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const candidates = useRef<RTCIceCandidateInit[]>([])
  const audio = useRef<HTMLAudioElement>(null)
  const generation = useRef(0)
  const locked = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = useCallback((value: Call | null) => { current.current = value; setCall(value) }, [])
  const reset = useCallback(() => {
    tone.current?.stop()
    generation.current++
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const oldPeer = peer.current
    peer.current = null
    if (oldPeer) { oldPeer.onconnectionstatechange = null; oldPeer.onicecandidate = null; oldPeer.ontrack = null; oldPeer.close() }
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null
    if (audio.current) audio.current.srcObject = null
    candidates.current = []; locked.current = false
    update(null); setBusy(false); setMuted(false); setElapsed(0); setAudioBlocked(false)
  }, [update])

  const end = useCallback((message = 'Cuộc gọi đã kết thúc.') => {
    const id = current.current?.id
    if (id && hub.current?.state === HubConnectionState.Connected) void hub.current.invoke('EndCall', id).catch(() => {})
    reset(); setNotice(message)
  }, [reset])

  const fail = useCallback((error: unknown) => {
    const message = error instanceof DOMException && error.name === 'NotAllowedError'
      ? 'Bạn cần cho phép Homeji sử dụng micro để gọi thoại.'
      : error instanceof DOMException && error.name === 'NotFoundError'
        ? 'Không tìm thấy micro. Kiểm tra thiết bị rồi thử lại.'
        : getErrorMessage(error, 'Không kết nối được cuộc gọi. Vui lòng thử lại.')
    end(message)
  }, [end])

  const armTimeout = useCallback((ms: number, message: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => end(message), ms)
  }, [end])

  const prepare = useCallback(async (version: number) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ gọi thoại. Hãy mở Homeji qua HTTPS trên trình duyệt mới.')
    const config = await apiRequest<{ available: boolean; iceServers: RTCIceServer[] }>('/api/chat/voice-config')
    if (generation.current !== version) return false
    if (!config.available) throw new Error('Gọi thoại đang chờ kích hoạt dịch vụ.')
    const local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
    if (generation.current !== version) { local.getTracks().forEach(t => t.stop()); return false }
    stream.current = local
    const rtc = new RTCPeerConnection({ iceServers: config.iceServers, iceTransportPolicy: 'relay' })
    peer.current = rtc
    local.getTracks().forEach(track => rtc.addTrack(track, local))
    rtc.onicecandidate = event => {
      const id = current.current?.id
      if (id && event.candidate) void hub.current?.invoke('Signal', id, 'candidate', JSON.stringify(event.candidate.toJSON())).catch(e => { if (generation.current === version) fail(e) })
    }
    rtc.ontrack = event => {
      if (!audio.current || generation.current !== version) return
      audio.current.srcObject = event.streams[0] ?? new MediaStream([event.track])
      void audio.current.play().catch(() => setAudioBlocked(true))
    }
    rtc.onconnectionstatechange = () => {
      if (generation.current !== version) return
      if (rtc.connectionState === 'connected' && current.current) {
        update({ ...current.current, phase: 'connected' })
        armTimeout(60 * 60 * 1000, 'Cuộc gọi đã đạt giới hạn 60 phút. Bạn có thể gọi lại.')
      } else if (rtc.connectionState === 'failed' || rtc.connectionState === 'disconnected') end('Kết nối cuộc gọi bị gián đoạn. Vui lòng gọi lại.')
    }
    return true
  }, [armTimeout, end, fail, update])

  useEffect(() => {
    if (!ownerId) return
    let alive = true
    const connection = new HubConnectionBuilder().withUrl(`${getApiBaseUrl().replace(/\/$/, '')}/hubs/voice`, {
      accessTokenFactory: async () => { await ensureFreshSession(); return getStoredSession()?.accessToken ?? '' },
    }).withAutomaticReconnect().configureLogging(LogLevel.None).build()
    hub.current = connection
    connection.on('incomingCall', (incoming: Incoming) => {
      if (!alive) return
      if (locked.current || current.current) { void connection.invoke('EndCall', incoming.callId).catch(() => {}); return }
      locked.current = true; setBusy(true); setNotice('')
      update({ id: incoming.callId, conversationId: incoming.conversationId, name: incoming.callerName, incoming: true, phase: 'ringing' })
      armTimeout(45000, 'Cuộc gọi nhỡ.')
    })
    connection.on('callAccepted', (id: string) => {
      const version = generation.current
      const rtc = peer.current
      if (!rtc || current.current?.id !== id || current.current.incoming) return
      update({ ...current.current, phase: 'connecting' }); armTimeout(30000, 'Không kết nối được âm thanh. Vui lòng gọi lại.')
      void (async () => {
        const offer = await rtc.createOffer()
        if (generation.current !== version) return
        await rtc.setLocalDescription(offer)
        await connection.invoke('Signal', id, 'offer', JSON.stringify(offer))
      })().catch(e => { if (generation.current === version) fail(e) })
    })
    connection.on('callClaimed', (event: { callId: string; connectionId: string }) => {
      if (current.current?.id === event.callId && connection.connectionId !== event.connectionId) { reset(); setNotice('Cuộc gọi được trả lời trên thiết bị khác.') }
    })
    connection.on('callSignal', (event: { callId: string; kind: string; payload: string }) => {
      const rtc = peer.current, version = generation.current
      if (!rtc || current.current?.id !== event.callId) return
      void (async () => {
        const data = JSON.parse(event.payload)
        if (event.kind === 'candidate') {
          if (rtc.remoteDescription) await rtc.addIceCandidate(data)
          else if (candidates.current.length < 200) candidates.current.push(data)
        } else if (event.kind === 'offer' || event.kind === 'answer') {
          if (data.type !== event.kind) throw new Error('Tín hiệu cuộc gọi không hợp lệ.')
          await rtc.setRemoteDescription(data)
          if (generation.current !== version) return
          for (const candidate of candidates.current.splice(0)) await rtc.addIceCandidate(candidate)
          if (event.kind === 'offer') {
            const answer = await rtc.createAnswer()
            if (generation.current !== version) return
            await rtc.setLocalDescription(answer)
            await connection.invoke('Signal', event.callId, 'answer', JSON.stringify(answer))
          }
        }
      })().catch(e => { if (generation.current === version) fail(e) })
    })
    connection.on('callEnded', (id: string) => { if (current.current?.id === id) { reset(); setNotice('Cuộc gọi đã kết thúc hoặc người nhận không thể nghe máy.') } })
    connection.onreconnecting(() => { if (alive) { setReady(false); if (locked.current) end('Kết nối bị gián đoạn. Vui lòng gọi lại.') } })
    connection.onreconnected(() => { if (alive) setReady(true) })
    connection.onclose(() => { if (alive) { setReady(false); if (locked.current) end('Mất kết nối dịch vụ gọi thoại.') } })
    let retry: ReturnType<typeof setTimeout> | undefined
    const connect = () => {
      if (!alive) return
      void connection.start().then(() => { if (alive) setReady(true) }).catch(() => { if (alive) retry = setTimeout(connect, 10000) })
    }
    connect()
    return () => { alive = false; if (retry) clearTimeout(retry); hub.current = null; reset(); setReady(false); void connection.stop().catch(() => {}) }
  }, [ownerId, armTimeout, end, fail, reset, update])

  useEffect(() => {
    if (call?.phase !== 'connected') return
    const started = Date.now()
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [call?.phase])

  useEffect(() => {
    if (call?.phase === 'ringing') { tone.current ??= new CallTone(); tone.current.start(call.incoming) }
    else tone.current?.stop()
    return () => tone.current?.stop()
  }, [call?.id, call?.phase, call?.incoming])
  useEffect(() => {
    if (!ownerId) return
    // Browsers allow incoming ringtones only after a user gesture on this page.
    const unlock = () => { tone.current ??= new CallTone(); tone.current.unlock() }
    window.addEventListener('pointerdown', unlock, { once: true, capture: true })
    window.addEventListener('keydown', unlock, { once: true, capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      tone.current?.close(); tone.current = null
    }
  }, [ownerId])
  useEffect(() => () => { tone.current?.close(); tone.current = null }, [])

  async function startCall(conversationId: string, name: string) {
    if (locked.current) return
    if (hub.current?.state !== HubConnectionState.Connected) { setNotice('Đang kết nối dịch vụ gọi thoại. Vui lòng thử lại sau ít giây.'); return }
    tone.current ??= new CallTone(); tone.current.unlock()
    locked.current = true; setBusy(true); setNotice('Đang chuẩn bị micro…')
    const version = ++generation.current
    const connection = hub.current
    try {
      if (!await prepare(version)) return
      const id = await connection.invoke<string>('StartCall', conversationId)
      if (generation.current !== version) { void connection.invoke('EndCall', id).catch(() => {}); return }
      setNotice(''); update({ id, conversationId, name, incoming: false, phase: 'ringing' })
      armTimeout(45000, 'Người nhận chưa nghe máy. Bạn có thể gọi lại sau.')
    } catch (e) { if (generation.current === version) fail(e) }
  }
  async function accept() {
    const incoming = current.current
    if (!incoming || incoming.phase !== 'ringing') return
    update({ ...incoming, phase: 'connecting' })
    const version = ++generation.current
    armTimeout(30000, 'Không kết nối được âm thanh. Vui lòng gọi lại.')
    try { if (await prepare(version)) await hub.current?.invoke('AcceptCall', incoming.id) }
    catch (e) { if (generation.current === version) fail(e) }
  }
  return <VoiceCalls.Provider value={{ startCall: (id, name) => void startCall(id, name), busy, ready }}>
    {children}
    <audio ref={audio} autoPlay />
    {call ? <section className="voice-call" role="dialog" aria-label="Cuộc gọi thoại" aria-live="polite">
      <span className="voice-call__icon" aria-hidden>☎</span><strong>{call.name}</strong>
      <p>{call.phase === 'connected' ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` : call.phase === 'connecting' ? 'Đang kết nối âm thanh…' : call.incoming ? 'Cuộc gọi thoại đến' : 'Đang chờ người nhận…'}</p>
      <div>{call.incoming && call.phase === 'ringing' ? <button type="button" onClick={() => void accept()}>Nghe máy</button> : call.phase === 'connected' ? <button type="button" aria-pressed={muted} onClick={() => { const next = !muted; stream.current?.getAudioTracks().forEach(t => { t.enabled = !next }); setMuted(next) }}>{muted ? 'Bật micro' : 'Tắt micro'}</button> : null}
        <button type="button" className="voice-call__end" onClick={() => end()}>{call.incoming && call.phase === 'ringing' ? 'Từ chối' : 'Kết thúc'}</button>
      </div>
      {audioBlocked && <button type="button" onClick={() => { void audio.current?.play().then(() => setAudioBlocked(false)).catch(() => setNotice('Trình duyệt chưa cho phép phát âm thanh.')) }}>Bật âm thanh cuộc gọi</button>}
    </section> : notice ? <div className="voice-call-notice" role="status">{notice}<button type="button" onClick={() => { if (busy) end(); setNotice('') }} aria-label="Đóng thông báo cuộc gọi">✕</button></div> : null}
  </VoiceCalls.Provider>
}
