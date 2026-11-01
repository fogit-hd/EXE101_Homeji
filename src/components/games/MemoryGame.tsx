import { useEffect, useId, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isVisibleFocusTarget } from '../../lib/isVisibleFocusTarget'
import { HomejiGameIcon } from './HomejiGameIcon'
import { GAME_CARD_NAMES, memoryGameReducer, newMemoryGame, readMemoryBest, saveMemoryBest, shuffledMemoryCards } from './memoryGameState'
import './MemoryGame.css'

export default function MemoryGame({ open, onClose, waiting = false }: { open: boolean; onClose: () => void; waiting?: boolean }) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [game, dispatch] = useReducer(memoryGameReducer, undefined, () => newMemoryGame())
  const [storedBest, setStoredBest] = useState(readMemoryBest)
  const [startedWaiting] = useState(waiting)
  const won = game.matched.length === 8
  const best = won ? Math.min(storedBest ?? Infinity, game.moves) : storedBest
  const ready = startedWaiting && !waiting

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
      element.showModal()
      return () => {
        element.close()
        if (previous?.isConnected && isVisibleFocusTarget(previous)) previous.focus()
        else {
          const composer = previous?.closest('[role="dialog"]')?.querySelector<HTMLTextAreaElement>('textarea:not([disabled])')
          if (composer && isVisibleFocusTarget(composer)) composer.focus()
        }
      }
    }
  }, [open])
  useEffect(() => {
    if (!open || game.shown.length !== 2) return
    const timeout = setTimeout(() => dispatch({ type: 'settle' }), 850)
    return () => clearTimeout(timeout)
  }, [game.shown, open])
  useEffect(() => { if (won && best !== null) saveMemoryBest(best) }, [won, best])

  return createPortal(<dialog ref={dialog} className="homeji-memory" role="dialog" aria-modal="true" aria-labelledby={titleId} data-glass-exclude
    onCancel={event => { event.preventDefault(); onClose() }} onClose={onClose}>
    <header className="homeji-memory__header">
      <div><span className="homeji-memory__eyebrow">CHƠI MỘT CHÚT</span><h2 id={titleId}>Lật thẻ Góc nhà</h2></div>
      <button type="button" className="homeji-memory__close" aria-label="Đóng trò chơi" onClick={onClose}>×</button>
    </header>
    {ready ? <div className="homeji-memory__ready" role="status"><span>Homeji đã phản hồi.</span><button type="button" onClick={onClose}>Quay lại chat</button></div> : null}
    <p className="homeji-memory__intro">Tìm 4 cặp đồ vật, gom một góc nhà xinh.</p>
    <div className="homeji-memory__score">
      <span><strong>{game.matched.length / 2}<small>/4</small></strong>Cặp đã tìm</span>
      <span><strong>{game.moves}</strong>Lượt lật</span>
      <span><strong>{best ?? '—'}</strong>Kỷ lục trên máy</span>
    </div>
    <div className="homeji-memory__board" aria-label="8 thẻ đồ vật">
      {game.cards.map((card, index) => {
        const matched = game.matched.includes(index)
        const revealed = matched || game.shown.includes(index)
        return <button type="button" key={card.id} className={`homeji-memory__card${revealed ? ' is-revealed' : ''}${matched ? ' is-matched' : ''}`}
          aria-label={`Thẻ ${index + 1}${revealed ? `: ${GAME_CARD_NAMES[card.kind]}` : ': chưa lật'}${matched ? ', đã ghép' : ''}`}
          aria-pressed={revealed} aria-disabled={matched || game.shown.length === 2}
          onClick={() => dispatch({ type: 'pick', index })}>
          <span className="homeji-memory__card-inner">
            <span className="homeji-memory__back"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m5 14 11-9 11 9v13H5Zm8 13v-9h6v9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg><span>homeji</span></span>
            <span className="homeji-memory__front"><HomejiGameIcon kind={card.kind} /><span>{GAME_CARD_NAMES[card.kind]}</span></span>
          </span>
        </button>
      })}
    </div>
    <p className="homeji-memory__status" role="status" aria-live="polite">{won ? `Góc nhà đã đủ đầy! Bạn hoàn thành trong ${game.moves} lượt.` : game.shown.length === 2 ? 'Chưa đúng cặp, thử lại nhé.' : `${game.matched.length / 2} trên 4 cặp đã tìm thấy.`}</p>
    <footer className="homeji-memory__footer"><button type="button" className="homeji-memory__restart" onClick={() => {
      setStoredBest(best)
      dispatch({ type: 'restart', cards: shuffledMemoryCards() })
    }}>{won ? 'Thêm một ván' : 'Chơi lại'}</button><button type="button" onClick={onClose}>Quay lại Homeji</button></footer>
  </dialog>, document.body)
}
