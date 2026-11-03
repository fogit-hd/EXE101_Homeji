import { useEffect, useRef, useState } from 'react'
import { gallerySwipeDirection } from '../../../lib/gallerySwipe'
import imageOffUrl from '../../../assets/room-detail/image-off.svg'

export function PhotoGallery({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const viewerRef = useRef<HTMLDialogElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const openPhoto = (nextIndex: number) => {
    setIndex(nextIndex)
    setView({ scale: 1, x: 0, y: 0 })
    viewerRef.current?.showModal()
  }
  const [failed, setFailed] = useState<string[]>([])
  const visible = urls.filter((url) => !failed.includes(url))
  const safeIndex = visible.length === 0 ? 0 : Math.min(index, visible.length - 1)
  const current = visible[safeIndex]
  const thumbs = visible.filter((_, itemIndex) => itemIndex !== safeIndex).slice(0, 2)
  const movePhoto = (direction: number) => {
    setIndex((safeIndex + direction + visible.length) % visible.length)
    setView({ scale: 1, x: 0, y: 0 })
    viewportRef.current?.scrollTo(0, 0)
  }

  const zoomAt = (factor: number, clientX?: number, clientY?: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2
    const py = (clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2
    setView((previous) => {
      const scale = Math.max(1, Math.min(5, previous.scale * factor))
      const ratio = scale / previous.scale
      const limitX = rect.width * (scale - 1) / 2
      const limitY = rect.height * (scale - 1) / 2
      return {
        scale,
        x: Math.max(-limitX, Math.min(limitX, px - (px - previous.x) * ratio)),
        y: Math.max(-limitY, Math.min(limitY, py - (py - previous.y) * ratio)),
      }
    })
  }

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1)
      zoomAt(Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.003), event.clientX, event.clientY)
    }
    viewport.addEventListener('wheel', wheel, { passive: false })
    return () => viewport.removeEventListener('wheel', wheel)
  }, [current])

  if (!current) {
    return (
      <div className="room-detail__photo-fallback">
        <img src={imageOffUrl} alt="" width={24} height={24} />
        <p>Tin đăng chưa cung cấp ảnh. Thông tin và các thao tác liên hệ vẫn hiển thị.</p>
      </div>
    )
  }

  return (
    <div className="room-detail__gallery">
      <div className={`room-detail__photos${thumbs.length === 0 ? ' is-single' : ''}`} data-glass-exclude>
        <button type="button" className="room-detail__photo-main" data-glass-exclude aria-label="Mở ảnh lớn" onClick={() => openPhoto(safeIndex)}>
          <img
            src={current}
            alt=""
            onError={() => setFailed((prev) => (prev.includes(current) ? prev : [...prev, current]))}
          />
          <span>
            {safeIndex + 1} / {visible.length} ảnh
          </span>
        </button>
        {thumbs.length > 0 ? (
          <div className="room-detail__thumbs">
            {thumbs.map((url) => (
              <button
                key={url}
                type="button"
                data-glass-exclude
                aria-label={`Xem ảnh ${visible.indexOf(url) + 1}`}
                onClick={() => openPhoto(visible.indexOf(url))}
              >
                <img
                  src={url}
                  alt=""
                  onError={() => setFailed((prev) => (prev.includes(url) ? prev : [...prev, url]))}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <dialog
        ref={viewerRef}
        className="room-photo-viewer" data-glass-exclude
        aria-label="Xem ảnh phòng"
        onCancel={event => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            movePhoto(event.key === 'ArrowLeft' ? -1 : 1)
          }
        }}
      >
        <div className="room-photo-viewer__toolbar">
          <span aria-live="polite">Ảnh {safeIndex + 1} / {visible.length}</span>
          <button type="button" aria-label="Thu nhỏ ảnh" disabled={view.scale <= 1} onClick={() => zoomAt(1 / 1.3)}>−</button>
          <button type="button" aria-label="Đặt lại mức phóng to" onClick={() => setView({ scale: 1, x: 0, y: 0 })}>🔍 {Math.round(view.scale * 100)}%</button>
          <button type="button" aria-label="Phóng to ảnh" disabled={view.scale >= 5} onClick={() => zoomAt(1.3)}>+</button>
          <button type="button" aria-label="Đóng ảnh lớn" onClick={() => viewerRef.current?.close()}>✕</button>
        </div>
        <div
          ref={viewportRef}
          className={`room-photo-viewer__viewport${view.scale > 1 ? ' is-zoomed' : ''}`}
          style={{ touchAction: view.scale > 1 ? 'none' : 'pan-y' }}
          onDoubleClick={(event) => zoomAt(view.scale > 1 ? 1 / view.scale : 2, event.clientX, event.clientY)}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            if (view.scale <= 1) {
              swipeRef.current = { x: event.clientX, y: event.clientY }
              event.currentTarget.setPointerCapture(event.pointerId)
              return
            }
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { x: event.clientX, y: event.clientY }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag) return
            const dx = event.clientX - drag.x
            const dy = event.clientY - drag.y
            dragRef.current = { x: event.clientX, y: event.clientY }
            const rect = event.currentTarget.getBoundingClientRect()
            setView((previous) => ({
              ...previous,
              x: Math.max(-rect.width * (previous.scale - 1) / 2, Math.min(rect.width * (previous.scale - 1) / 2, previous.x + dx)),
              y: Math.max(-rect.height * (previous.scale - 1) / 2, Math.min(rect.height * (previous.scale - 1) / 2, previous.y + dy)),
            }))
          }}
          onPointerUp={event => {
            const start = swipeRef.current
            if (start && view.scale <= 1 && visible.length > 1) {
              const direction = gallerySwipeDirection(event.clientX - start.x, event.clientY - start.y)
              if (direction) movePhoto(direction)
            }
            dragRef.current = null; swipeRef.current = null
          }}
          onPointerCancel={() => { dragRef.current = null; swipeRef.current = null }}
          onLostPointerCapture={() => { dragRef.current = null; swipeRef.current = null }}
        >
          <img key={current} className="room-photo-viewer__image" src={current} alt={`Ảnh phòng ${safeIndex + 1}`} draggable={false}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />
        </div>
        {visible.length > 1 ? (
          <div className="room-photo-viewer__navigation">
            <button type="button" onClick={() => movePhoto(-1)}>← Ảnh trước</button>
            <button type="button" onClick={() => movePhoto(1)}>Ảnh tiếp →</button>
          </div>
        ) : null}
      </dialog>
    </div>
  )
}
