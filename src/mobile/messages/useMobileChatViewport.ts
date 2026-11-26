import { useEffect } from 'react'

/**
 * Phone chat thread: while `enabled`, the open conversation fills the screen (the app header and
 * tab bar hide through html[data-m-chat]) and follows the visual viewport, so the composer sits
 * right on top of the on-screen keyboard on both iOS and Android. When the keyboard opens and the
 * reader was at the latest message, the list stays pinned to it.
 */
export function useMobileChatViewport(enabled: boolean, scrollerSelector: string) {
  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    const vv = window.visualViewport
    root.dataset.mChat = 'thread'
    let nearBottom = true
    let lastHeight = 0
    const scroller = () => document.querySelector<HTMLElement>(scrollerSelector)
    const onScroll = (event: Event) => {
      const el = event.target as HTMLElement
      if (!el.matches?.(scrollerSelector)) return
      nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96
    }
    const apply = () => {
      const height = vv ? vv.height : window.innerHeight
      root.style.setProperty('--m-vv-h', `${Math.round(height)}px`)
      root.style.setProperty('--m-vv-top', `${Math.round(vv ? vv.offsetTop : 0)}px`)
      // A noticeably shorter viewport means the keyboard came up.
      root.toggleAttribute('data-m-keyboard', window.innerHeight - height > 120)
      if (height < lastHeight && nearBottom) {
        const el = scroller()
        if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
      }
      lastHeight = height
    }
    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      document.removeEventListener('scroll', onScroll, true)
      delete root.dataset.mChat
      root.removeAttribute('data-m-keyboard')
      root.style.removeProperty('--m-vv-h')
      root.style.removeProperty('--m-vv-top')
    }
  }, [enabled, scrollerSelector])
}
