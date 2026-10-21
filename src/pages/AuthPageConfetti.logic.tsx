export const SUCCESS_SRC = '/lottie/success-confetti.lottie'

export const WRONG_SRC = '/lottie/perfect-wrong.lottie'

export const ASSETS = [SUCCESS_SRC, WRONG_SRC] as const

export let warmStarted = false

export function warmConfettiLottie() {
  if (warmStarted || typeof window === 'undefined') return
  warmStarted = true
  for (const href of ASSETS) {
    void fetch(href, { cache: 'force-cache' }).catch(() => {})
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'fetch'
    link.href = href
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }
}
