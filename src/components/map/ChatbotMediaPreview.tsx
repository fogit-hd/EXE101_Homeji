import type { ChatbotDraftAttachment } from '../../lib/chatbotMedia'

export function ChatbotMediaPreview({ attachments, onRemove }: { attachments: ChatbotDraftAttachment[]; onRemove?: (id: string) => void }) {
  if (!attachments.length) return null
  return <div className="homeji-assistant__attachments">
    {attachments.map(file => <div key={file.id} className="homeji-assistant__attachment" data-glass-exclude>
      {file.mimeType === 'audio/wav' ? <audio controls src={file.preview} preload="metadata" aria-label="Bản ghi đính kèm" />
        : <a href={file.preview} target="_blank" rel="noreferrer" aria-label={`Xem ảnh ${file.name}`}><img src={file.preview} alt={file.name} /></a>}
      {onRemove ? <button type="button" onClick={() => onRemove(file.id)} aria-label={`Gỡ ${file.name}`}>×</button> : null}
    </div>)}
  </div>
}
