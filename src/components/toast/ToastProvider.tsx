import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ToastContext, type ToastTone } from './toast-context'
import './ToastProvider.css'

export type { ToastTone }

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

const DISMISS_MS = 4500
const STACK_LIMIT = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<number, number>())
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer != null) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const text = message.trim()
    if (!text) return
    const id = nextId.current++
    setToasts((current) => [...current, { id, message: text, tone }].slice(-STACK_LIMIT))
    const timer = window.setTimeout(() => dismiss(id), DISMISS_MS)
    timers.current.set(id, timer)
  }, [dismiss])

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const api = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="app-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`app-toast app-toast--${toast.tone}`} role="status">
            <p>{toast.message}</p>
            <button type="button" className="app-toast__close" onClick={() => dismiss(toast.id)} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
