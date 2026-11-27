import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

const HANDLE_WIDTH = 12

export function splitPanelWidth(stage: number, requested: number): number {
  return Math.max(Math.min(280, stage / 2), Math.min(requested, Math.max(stage / 2, stage - 320 - HANDLE_WIDTH)))
}

export function splitColumns(width: number): number {
  return Math.max(1, Math.min(3, Math.floor((width - 16) / 256)))
}

/** Pane width and column count update together via CSS during drag; React stores the result on release. */
export function useListingSplit() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(0)
  const [ratio, setRatio] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; width: number; stage: number; handle: HTMLDivElement } | null>(null)
  const frame = useRef<number | null>(null)
  const width = splitPanelWidth(stageWidth, ratio === null ? Math.min(stageWidth / 2, 760) : stageWidth * ratio)
  const columns = ratio === null ? 2 : splitColumns(width)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => setStageWidth(stage.getBoundingClientRect().width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => {
      observer.disconnect()
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])
  const move = (x: number) => {
    const current = drag.current
    if (!current || !current.stage) return
    const next = splitPanelWidth(current.stage, current.width + x - current.x)
    const liveColumns = splitColumns(next)
    stageRef.current?.style.setProperty('--ml-split-width', `${next}px`)
    stageRef.current?.style.setProperty('--ml-split-columns', String(liveColumns))
    current.handle.setAttribute('aria-valuenow', String(Math.round(next)))
    current.handle.setAttribute('aria-valuetext', `${liveColumns} cột phòng, danh sách rộng ${Math.round(next)} pixel`)
    return next / current.stage
  }
  const restore = () => {
    stageRef.current?.style.setProperty('--ml-split-width', `${width}px`)
    stageRef.current?.style.setProperty('--ml-split-columns', String(columns))
    drag.current?.handle.setAttribute('aria-valuenow', String(Math.round(width)))
    drag.current?.handle.setAttribute('aria-valuetext', `${columns} cột phòng, danh sách rộng ${Math.round(width)} pixel`)
  }
  const stop = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null }
    if (event.type !== 'pointercancel') setRatio(move(event.clientX) ?? ratio)
    else restore()
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null
    if (event.key === 'ArrowLeft') next = width - (event.shiftKey ? 80 : 24)
    else if (event.key === 'ArrowRight') next = width + (event.shiftKey ? 80 : 24)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = stageWidth
    else if (event.key === 'Enter') next = null
    else return
    event.preventDefault()
    setRatio(next === null ? null : splitPanelWidth(stageWidth, next) / Math.max(1, stageWidth))
  }
  return {
    stageRef,
    dragging,
    style: { '--ml-split-width': stageWidth ? `${width}px` : 'min(50%, 760px)', '--ml-split-columns': columns } as CSSProperties,
    separatorProps: {
      role: 'separator' as const,
      tabIndex: 0,
      'aria-label': 'Điều chỉnh độ rộng danh sách phòng và bản đồ',
      'aria-orientation': 'vertical' as const,
      'aria-controls': 'map-listings-results',
      'aria-valuemin': Math.round(splitPanelWidth(stageWidth, 0)),
      'aria-valuemax': Math.round(splitPanelWidth(stageWidth, stageWidth)),
      'aria-valuenow': Math.round(width),
      'aria-valuetext': `${columns} cột phòng, danh sách rộng ${Math.round(width)} pixel`,
      title: 'Kéo để đổi độ rộng · phím mũi tên để điều chỉnh · Enter hoặc bấm đúp để về 2 cột',
      onKeyDown,
      onDoubleClick: () => setRatio(null),
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus({ preventScroll: true })
        drag.current = { x: event.clientX, width, stage: stageWidth, handle: event.currentTarget }
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return
        if (frame.current !== null) cancelAnimationFrame(frame.current)
        const x = event.clientX
        frame.current = requestAnimationFrame(() => { frame.current = null; move(x) })
      },
      onPointerUp: stop,
      onPointerCancel: stop,
      onLostPointerCapture: () => { if (drag.current) { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; restore(); drag.current = null; setDragging(false) } },
    },
  }
}
