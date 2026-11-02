import type { RefObject } from 'react'
import type { AgentPostDraft } from '../../api/chatbotAgent'
import type { ChatbotLocation } from '../../lib/chatbotLocation'
import { AgentPostPreview } from '../ai/AgentPostPreview'

type Props = {
  draft: AgentPostDraft
  sharedLocation: ChatbotLocation | null
  active: boolean
  open: boolean
  closeRef: RefObject<HTMLButtonElement | null>
  onReturnToChat: () => void
  onFinished: () => void
}

export function AgentDraftWorkspace({ draft, sharedLocation, active, open, closeRef, onReturnToChat, onFinished }: Props) {
  return (
    <aside className="homeji-assistant__draft-workspace" aria-label="Bản nháp đang duyệt" hidden={!open}>
      <header>
        <div><small>KHÔNG GIAN DUYỆT BÀI</small><strong>Bản nháp của bạn</strong></div>
        <button ref={closeRef} type="button" aria-label="Về hội thoại" onClick={onReturnToChat}>
          Về hội thoại <span aria-hidden>×</span>
        </button>
      </header>
      <AgentPostPreview key={draft.id} draft={draft} sharedLocation={sharedLocation} active={active} onFinished={onFinished} />
    </aside>
  )
}
