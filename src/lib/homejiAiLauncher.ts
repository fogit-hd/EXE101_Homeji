/** Navbar entry ↔ global MapChatbot. The chat window has no floating launcher; it opens only from here. */
const TOGGLE = 'homeji-ai:toggle'
const STATE = 'homeji-ai:state'

export type HomejiAiToggleDetail = { anchor: DOMRect | null; open?: boolean }

let lastOpen = false

export function toggleHomejiAi(anchor: Element | null, open?: boolean) {
  window.dispatchEvent(new CustomEvent<HomejiAiToggleDetail>(TOGGLE, {
    detail: { anchor: anchor?.getBoundingClientRect() ?? null, open },
  }))
}

export function onHomejiAiToggle(fn: (detail: HomejiAiToggleDetail) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<HomejiAiToggleDetail>).detail)
  window.addEventListener(TOGGLE, handler)
  return () => window.removeEventListener(TOGGLE, handler)
}

export function publishHomejiAiOpen(open: boolean) {
  lastOpen = open
  window.dispatchEvent(new CustomEvent<boolean>(STATE, { detail: open }))
}

export function subscribeHomejiAiOpen(fn: () => void) {
  window.addEventListener(STATE, fn)
  return () => window.removeEventListener(STATE, fn)
}

export const homejiAiOpenSnapshot = () => lastOpen

/** Marks the trigger so the chat's outside-click handler ignores it. */
export const HOMEJI_AI_TRIGGER_ATTR = 'data-homeji-ai-trigger'
