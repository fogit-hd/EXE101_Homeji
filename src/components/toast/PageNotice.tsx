import { useEffect, useRef } from 'react'
import type { ToastTone } from './toast-context'
import { useToast } from './useToast'

/** Sends a page-level message to the toast stack once. Renders nothing. */
export function PageNotice({
  message,
  tone = 'info',
}: {
  message?: string | null
  tone?: ToastTone
}) {
  const { push } = useToast()
  const seen = useRef<string | null>(null)

  useEffect(() => {
    const text = message?.trim() ?? ''
    if (!text) {
      seen.current = null
      return
    }
    if (seen.current === text) return
    seen.current = text
    push(text, tone)
  }, [message, tone, push])

  return null
}
