import { createContext } from 'react'

export type ToastTone = 'error' | 'warning' | 'success' | 'info'

export type ToastApi = {
  push: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastApi | null>(null)
