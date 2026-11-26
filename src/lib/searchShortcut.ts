type ShortcutEvent = {
  key: string
  defaultPrevented?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  isComposing?: boolean
  repeat?: boolean
}

export function shouldHandleSearchShortcut(event: ShortcutEvent, editing: boolean, modalOpen: boolean) {
  return event.key === '/' && !event.defaultPrevented && !event.ctrlKey && !event.metaKey
    && !event.altKey && !event.isComposing && !event.repeat && !editing && !modalOpen
}
