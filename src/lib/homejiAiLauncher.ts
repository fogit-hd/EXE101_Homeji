/** Navbar entry ↔ global MapChatbot. The chat window has no floating launcher; it opens only from here. */
const TOGGLE = 'homeji-ai:toggle'
const STATE = 'homeji-ai:state'
export const HOMEJI_AI_PANEL_ID = 'homeji-ai-conversation'

export type HomejiAiToggleDetail = { anchor: DOMRect | null; open?: boolean }

let lastOpen = false
const listeners = new Set<(event: Event) => void>()
let pending: HomejiAiToggleDetail | null = null

export function toggleHomejiAi(anchor: Element | null, open?: boolean) {
  const detail = { anchor: anchor?.getBoundingClientRect() ?? null, open }
  // The global chat is lazy loaded; retain the latest intent until it subscribes.
  if (!listeners.size) { pending = { ...detail, open: open ?? !(pending?.open ?? lastOpen) }; return }
  window.dispatchEvent(new CustomEvent<HomejiAiToggleDetail>(TOGGLE, {
    detail,
  }))
}

export function onHomejiAiToggle(fn: (detail: HomejiAiToggleDetail) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<HomejiAiToggleDetail>).detail)
  window.addEventListener(TOGGLE, handler)
  listeners.add(handler)
  if (pending) { const request = pending; pending = null; fn(request) }
  return () => { window.removeEventListener(TOGGLE, handler); listeners.delete(handler) }
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
