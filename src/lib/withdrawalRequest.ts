export type WithdrawalInput = { amount: number; bankName: string; accountNumber: string; accountHolder: string }

// Only a digest of the bank details is persisted; keep the same request ID after
// timeout/reload until the API confirms creation. Scope attempts to the wallet owner.
export async function withdrawalAttempt(userId: string, input: WithdrawalInput, storage: Storage = sessionStorage) {
  const canonical = JSON.stringify([input.amount, input.bankName.trim(), input.accountNumber.trim(), input.accountHolder.trim().toUpperCase()])
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const digest = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
  const key = `homeji-withdrawal:${userId}:${digest}`
  const existing = storage.getItem(key)
  const reused = Boolean(existing && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(existing))
  const requestId = reused ? existing! : crypto.randomUUID()
  storage.setItem(key, requestId)
  return { requestId, reused, complete: () => { try { storage.removeItem(key) } catch { /* A retained key safely resolves to the same completed request. */ } } }
}
