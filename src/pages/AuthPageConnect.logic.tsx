export const CONNECTION_SRC = '/lottie/connection.lottie'

export const SAD_SRC = '/lottie/sad-animation.lottie'

export const ERROR_ICON_SRC = '/lottie/error.lottie'

export let warmStarted = false

export function warmConnectLottie() {
  if (warmStarted || typeof window === 'undefined') return
  warmStarted = true
  for (const href of [CONNECTION_SRC, SAD_SRC, ERROR_ICON_SRC]) {
    void fetch(href, { cache: 'force-cache' }).catch(() => {})
  }
}
