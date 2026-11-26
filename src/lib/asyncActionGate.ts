/** A synchronous lock, including async work before React can render disabled controls. */
export function createAsyncActionGate() {
  let busy = false
  return async (action: () => Promise<void>) => {
    if (busy) return
    busy = true
    try { await action() } finally { busy = false }
  }
}

/** Independent operations/threads must not share one global busy flag. */
export function createKeyedAsyncActionGate() {
  const busy = new Set<string>()
  return async (key: string, action: () => Promise<void>) => {
    if (busy.has(key)) return
    busy.add(key)
    try { await action() } finally { busy.delete(key) }
  }
}
