import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ThemeContext } from '../contexts/ThemeContext'
import { applyTheme, currentTheme, savedTheme, THEME_KEY, type Theme } from '../lib/theme'
import { ThemeSwitch } from './theme/ThemeSwitch'
import { themeDrop } from './theme/themeDrop'
import './theme/theme.css'

export function ThemeSync({ children }: { children?: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const [busy, setBusy] = useState(false)
  const running = useRef<AbortController | null>(null)
  useLayoutEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => {
    const preference = matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      running.current?.abort()
      const next = savedTheme() ?? (preference.matches ? 'dark' : 'light')
      applyTheme(next)
      setTheme(next)
      setBusy(false)
    }
    const onStorage = (event: StorageEvent) => { if (event.key === THEME_KEY || event.key === null) sync() }
    preference.addEventListener('change', sync)
    window.addEventListener('storage', onStorage)
    return () => {
      running.current?.abort()
      preference.removeEventListener('change', sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  const toggle = async (element: HTMLElement) => {
    if (running.current) return
    const controller = new AbortController()
    running.current = controller
    setBusy(true)
    const next = theme === 'dark' ? 'light' : 'dark'
    const commit = () => {
      if (controller.signal.aborted) return
      flushSync(() => { applyTheme(next, true); setTheme(next) })
    }
    try { await themeDrop(next, element.getBoundingClientRect(), commit, controller.signal) }
    catch { if (!controller.signal.aborted) commit() }
    finally {
      if (running.current === controller) running.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return <ThemeContext.Provider value={{ theme, busy, toggle }}>
    {children}<ThemeSwitch floating />
    <span className="sr-only" role="status">{busy ? 'Đang chuyển giao diện' : theme === 'dark' ? 'Đã bật giao diện tối' : 'Đã bật giao diện sáng'}</span>
  </ThemeContext.Provider>
}
