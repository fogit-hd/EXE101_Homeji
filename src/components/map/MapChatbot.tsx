import { useEffect, useRef, useState } from 'react'
import {
  ChatMessageSender,
  getChatbotPopupConfig,
  sendChatbotMessage,
  type AiHighlightResponse,
  type ChatbotMessage,
  type ChatbotPopupConfig,
} from '../../api'
import { getErrorMessage } from '../../lib/errors'
import './MapChatbot.css'

type Props = {
  onSearchUpdate?: (update: AiHighlightResponse) => void
  /** Render inside map app panel (no floating FAB). */
  embedded?: boolean
}

export function MapChatbot({ onSearchUpdate, embedded = false }: Props) {
  const [open, setOpen] = useState(embedded)
  const [config, setConfig] = useState<ChatbotPopupConfig | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [messages, setMessages] = useState<ChatbotMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void getChatbotPopupConfig()
      .then((cfg) => {
        if (!cancelled) setConfig(cfg)
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({
            enabled: true,
            title: 'Homeji Assistant',
            greeting: 'Hỏi mình về phòng trọ, giá, khu vực…',
            suggestedPrompts: ['Phòng dưới 4 triệu gần FPT', 'Ở ghép Thủ Đức'],
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!embedded && !open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, embedded])

  if (config && !config.enabled) return null

  const title = config?.title || 'Homeji Assistant'
  const greeting = config?.greeting || 'Xin chào! Mình có thể giúp tìm phòng.'

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy) return
    setBusy(true)
    setError(null)
    setDraft('')
    try {
      const reply = await sendChatbotMessage({ conversationId, message })
      setConversationId(reply.conversationId)
      setMessages((prev) => [...prev, reply.userMessage, reply.assistantMessage])
      if (reply.searchUpdate) onSearchUpdate?.(reply.searchUpdate)
    } catch (e) {
      setError(getErrorMessage(e, 'Chatbot tạm thời không phản hồi'))
    } finally {
      setBusy(false)
    }
  }

  const chatBody = (
    <>
      <div className="map-chatbot__body">
        {messages.length === 0 ? (
          <div className="map-chatbot__greeting map-motion-fade-up">
            <p>{greeting}</p>
            <div className="map-chatbot__suggestions">
              {(config?.suggestedPrompts ?? []).slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="map-motion-press"
                  onClick={() => void send(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`map-chatbot__msg${m.sender === ChatMessageSender.User ? ' is-user' : ''}`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="map-chatbot__error">{error}</p> : null}

      <form
        className="map-chatbot__form"
        onSubmit={(e) => {
          e.preventDefault()
          void send(draft)
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Hỏi về phòng, giá, khu vực…"
          disabled={busy}
        />
        <button type="submit" className="map-motion-press" disabled={busy || !draft.trim()}>
          Gửi
        </button>
      </form>
    </>
  )

  if (embedded) {
    return (
      <div className="map-chatbot map-chatbot--embedded" role="region" aria-label={title}>
        <div className="map-chatbot__panel is-visible">
          <header className="map-chatbot__head">
            <div>
              <strong>{title}</strong>
              <p>Đồng bộ tìm kiếm trên bản đồ</p>
            </div>
          </header>
          {chatBody}
        </div>
      </div>
    )
  }

  return (
    <div className="map-chatbot" style={{ pointerEvents: 'none' }}>
      <button
        type="button"
        className={`map-chatbot__fab map-motion-press${open ? ' is-open' : ''}`}
        style={{ pointerEvents: 'auto' }}
        aria-expanded={open}
        aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '×' : 'AI'}
      </button>

      <div
        className={`map-chatbot__panel${open ? ' is-visible' : ''}`}
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        aria-hidden={!open}
        role="dialog"
        aria-label={title}
      >
        <header className="map-chatbot__head">
          <div>
            <strong>{title}</strong>
            <p>Đồng bộ tìm kiếm trên bản đồ</p>
          </div>
          <button type="button" className="map-chatbot__close" onClick={() => setOpen(false)}>
            ×
          </button>
        </header>
        {chatBody}
      </div>
    </div>
  )
}
