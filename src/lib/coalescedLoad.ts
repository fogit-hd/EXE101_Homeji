/** Serialize loads, coalescing intermediate changes into one latest-input reload. */
export function createCoalescedLoad(run: () => Promise<void>) {
  let active: Promise<void> | null = null
  let pending = false
  return () => {
    if (active) {
      pending = true
      return active
    }
    active = (async () => {
      do {
        pending = false
        try {
          await run()
        } catch (error) {
          if (!pending) throw error
        }
      } while (pending)
    })().finally(() => { active = null })
    return active
  }
}
