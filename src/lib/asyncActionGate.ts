/** A synchronous lock, including async work before React can render disabled controls. */
export function createAsyncActionGate() {
  let busy = false
  return async (action: () => Promise<void>) => {
    if (busy) return
    busy = true
    try { await action() } finally { busy = false }
  }
}
