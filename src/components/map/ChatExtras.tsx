import { PremiumStars } from '../PremiumStars'
import { useEffect, useRef, useState } from 'react'
import { chatEmojiGroups } from '../../lib/chatEmojis'
import { apiRequest } from '../../api/client'
import type { PostMessage } from '../../api'
import type { ResolvedChatGif } from '../../lib/chatGif'
import { resolveChatGif, searchChatGifs } from '../../lib/giphyClient'
import { getErrorMessage } from '../../lib/errors'
import { useDismissOnOutside } from '../../lib/useDismissOnOutside'

export function PremiumBadge({ compact = false }: { compact?: boolean }) {
  return <span className="chat-premium" title="Thành viên Premium" aria-label="Thành viên Premium">
    <span className="chat-premium__crown" aria-hidden>♛</span><span>{compact ? 'PRO' : 'Premium'}</span>
    <PremiumStars />
  </span>
}

export function PublicProfile({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<{ id: string; displayName: string; avatarPath: string | null; createdAt: string; isPremium: boolean } | null>(null)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    let current = true
    void apiRequest<NonNullable<typeof profile>>(`/api/profile/${encodeURIComponent(userId)}`)
      .then(data => { if (current) setProfile(data) })
      .catch(e => { if (current) setError(getErrorMessage(e, 'Không tải được hồ sơ')) })
    return () => { current = false; element?.close() }
  }, [userId])
  return <dialog ref={dialog} className={`chat-profile ${profile?.isPremium ? 'is-premium' : ''}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }} aria-label="Hồ sơ người dùng">
    <button type="button" className="chat-profile__close" onClick={onClose} aria-label="Đóng hồ sơ" autoFocus>✕</button>
    {error ? <p role="alert">{error}</p> : profile ? <>
      <div className="chat-profile__avatar">{profile.avatarPath && /^https:\/\//.test(profile.avatarPath) ? <img src={profile.avatarPath} alt="" /> : profile.displayName.slice(0, 2).toUpperCase()}</div>
      {profile.isPremium && <PremiumBadge />}
      <h2>{profile.displayName}</h2>
      <p>Tham gia Homeji từ {new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</p>
      <small>Thông tin liên hệ cá nhân được giữ riêng tư.</small>
    </> : <p role="status">Đang tải hồ sơ…</p>}
  </dialog>
}

export function ChatGifMessage({ id }: { id: string }) {
  const [gif, setGif] = useState<ResolvedChatGif | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void resolveChatGif(id, controller.signal).then(data => { if (!controller.signal.aborted) setGif(data) }).catch(e => {
      if (!controller.signal.aborted) setError(getErrorMessage(e, 'GIF không còn khả dụng.'))
    })
    return () => controller.abort()
  }, [id])
  return <div>{gif ? <img className="chat-gif" src={gif.url} alt={gif.title || 'GIF'} loading="lazy" referrerPolicy="no-referrer" /> : <span role="status">{error || 'Đang tải GIF…'}</span>}
  </div>
}

export function ChatMediaPicker({ conversationId, disabled, onEmoji, onSent, onError }: {
  conversationId: string; disabled: boolean; onEmoji: (emoji: string) => void; onSent: (message: PostMessage) => void; onError: (error: string) => void
}) {
  const [emojiGroup, setEmojiGroup] = useState(0)
  const [mode, setMode] = useState<'emoji' | 'gif' | null>(null)
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<ResolvedChatGif[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const gate = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const currentId = useRef(conversationId)
  useEffect(() => { currentId.current = conversationId; return () => { currentId.current = '' } }, [conversationId])
  useDismissOnOutside(mode !== null, [root], () => setMode(null))
  useEffect(() => {
    if (mode !== 'gif') return
    let current = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true); setError(''); setGifs([])
      void searchChatGifs(query, controller.signal)
        .then(data => { if (current) setGifs(data) })
        .catch(e => { if (current) setError(getErrorMessage(e, 'Không tìm được GIF')) })
        .finally(() => { if (current) setLoading(false) })
    }, 350)
    return () => { current = false; controller.abort(); window.clearTimeout(timer) }
  }, [mode, query])
  async function send(gif: ResolvedChatGif) {
    if (gate.current || disabled) return
    gate.current = true; setSending(true)
    const id = conversationId
    try {
      const message = await apiRequest<PostMessage>(`/api/chat/conversations/${encodeURIComponent(id)}/gifs/${encodeURIComponent(gif.id)}`, { method: 'POST' })
      if (currentId.current === id) { onSent(message); setMode(null) }
    } catch (e) { if (currentId.current === id) onError(getErrorMessage(e, 'Không gửi được GIF')) }
    finally { gate.current = false; setSending(false) }
  }
  return <div className="chat-media" ref={root} onKeyDown={e => { if (e.key === 'Escape') setMode(null) }}>
    <button type="button" disabled={disabled} aria-label="Chọn emoji" aria-expanded={mode === 'emoji'} onClick={() => setMode(mode === 'emoji' ? null : 'emoji')}>☺</button>
    <button type="button" disabled={disabled} aria-label="Chọn GIF" aria-expanded={mode === 'gif'} onClick={() => setMode(mode === 'gif' ? null : 'gif')}>GIF</button>
    {mode && <section className="chat-media__picker" role="dialog" aria-label={mode === 'emoji' ? 'Emoji' : 'GIF'}>
      <header><strong>{mode === 'emoji' ? 'Thêm cảm xúc' : 'Tìm GIF'}</strong><button type="button" onClick={() => setMode(null)} aria-label="Đóng bộ chọn">✕</button></header>
      {mode === 'emoji' ? <><nav className="chat-media__categories" aria-label="Nhóm emoji">{chatEmojiGroups.map((group, index) => <button type="button" key={group.name} aria-label={group.name} aria-pressed={index === emojiGroup} onClick={() => setEmojiGroup(index)}>{group.icon}</button>)}</nav><p className="chat-media__group-name">{chatEmojiGroups[emojiGroup].name} · {chatEmojiGroups[emojiGroup].emojis.length} emoji</p><div className="chat-media__emojis">{chatEmojiGroups[emojiGroup].emojis.map(emoji => <button type="button" key={emoji} aria-label={emoji} onClick={() => onEmoji(emoji)}>{emoji}</button>)}</div></> : <>
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} maxLength={50} aria-label="Tìm GIF" placeholder="Tìm cảm xúc, lời chào…" />
        {loading ? <p role="status">Đang tìm GIF…</p> : error ? <p role="alert">{error}</p> : <div className="chat-media__gifs">{gifs.map(gif => <button type="button" key={gif.id} disabled={sending} onClick={() => void send(gif)} aria-label={`Gửi GIF: ${gif.title}`}><img src={gif.url} alt={gif.title} loading="lazy" referrerPolicy="no-referrer" /></button>)}{!gifs.length && <p>Chưa có GIF phù hợp.</p>}</div>}
      </>}
    </section>}
  </div>
}
