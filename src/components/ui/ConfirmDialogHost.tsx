import { useEffect, useId, useRef, useState } from 'react'
import { registerConfirmPresenter, type ConfirmRequest } from './confirmDialog'
import './confirmDialog.css'

export function ConfirmDialogHost() {
  const [queue, setQueue] = useState<ConfirmRequest[]>([])
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()
  const request = queue[0]

  useEffect(() => registerConfirmPresenter(next => setQueue(items => [...items, next])), [])

  useEffect(() => {
    const node = dialog.current
    if (request && node && !node.open) node.showModal()
  }, [request])

  if (!request) return null
  const answer = (accepted: boolean) => {
    dialog.current?.close()
    request.resolve(accepted)
    setQueue(items => items.slice(1))
  }
  return <dialog ref={dialog} className="confirm-dialog" data-glass-exclude aria-labelledby={titleId} aria-describedby={request.message ? messageId : undefined}
    onCancel={event => { event.preventDefault(); answer(false) }}>
    <h2 id={titleId}>{request.title}</h2>
    {request.message ? <p id={messageId}>{request.message}</p> : null}
    <div className="confirm-dialog__actions">
      <button type="button" className="btn btn-secondary" autoFocus={request.danger} onClick={() => answer(false)}>{request.cancelLabel ?? 'Hủy'}</button>
      <button type="button" className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`} autoFocus={!request.danger} onClick={() => answer(true)}>{request.confirmLabel}</button>
    </div>
  </dialog>
}
