type Slot = 'inbox' | 'assistant' | `thread:${string}`
type Identity = { id: 'identity'; ownerId: string; generation: string; key: CryptoKey }
type Snapshot = { id: Slot; writtenAt: number; iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer }
type RemovedSnapshot = { id: Slot; writtenAt: number; removed: true }
type StoredSnapshot = Snapshot | RemovedSnapshot
type CacheSession = { ownerId: string; identity: Promise<Identity | undefined> }

const databaseName = 'homeji-chat-cache'
const storeName = 'cache'
const maxThreadSnapshots = 20
const maxSnapshotChars = 512 * 1024
const lifetimeMs = 7 * 24 * 60 * 60 * 1_000
const encoder = new TextEncoder()
const decoder = new TextDecoder()
let dbPromise: Promise<IDBDatabase | undefined> | undefined
let session: CacheSession | null = null
let sessionChange = Promise.resolve()
let previousAccount: string | null | undefined
let lastWriteTime = 0

function nextWriteTime() {
  lastWriteTime = Math.max(lastWriteTime + 0.01, Date.now())
  return lastWriteTime
}

function openDatabase() {
  if (typeof indexedDB === 'undefined' || !globalThis.crypto?.subtle) return Promise.resolve(undefined)
  dbPromise ??= new Promise<IDBDatabase | undefined>(resolve => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' }).createIndex('writtenAt', 'writtenAt')
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); dbPromise = undefined }
      resolve(db)
    }
    request.onerror = () => { dbPromise = undefined; resolve(undefined) }
  })
  return dbPromise
}

function transaction<T>(
  db: IDBDatabase, mode: IDBTransactionMode,
  act: (store: IDBObjectStore, output: (value: T) => void) => void,
): Promise<T | undefined> {
  return new Promise(resolve => {
    const tx = db.transaction(storeName, mode)
    let output: T | undefined
    tx.oncomplete = () => resolve(output)
    tx.onabort = () => resolve(undefined)
    act(tx.objectStore(storeName), value => { output = value })
  })
}

async function prepareIdentity(ownerId: string, active: () => boolean): Promise<Identity | undefined> {
  const db = await openDatabase()
  if (!db || !active()) return
  const existing = await transaction<Identity>(db, 'readonly', (store, output) => {
    const lookup = store.get('identity')
    lookup.onsuccess = () => {
      const identity = lookup.result as Identity | undefined
      if (identity?.ownerId === ownerId) output(identity)
    }
  })
  if (existing || !active()) return existing
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  if (!active()) return
  return transaction<Identity>(db, 'readwrite', (store, output) => {
    const lookup = store.get('identity')
    lookup.onsuccess = () => {
      if (!active()) return
      const current = lookup.result as Identity | undefined
      // A second tab may have created the key while this tab was generating one.
      if (current?.ownerId === ownerId) { output(current); return }
      const identity: Identity = { id: 'identity', ownerId, generation: crypto.randomUUID(), key }
      store.clear()
      store.put(identity)
      output(identity)
    }
  })
}

/** The auth provider calls this only for an established account or a confirmed sign-out. */
export function setChatCacheAccount(ownerId: string | null) {
  if (ownerId === previousAccount) return
  previousAccount = ownerId
  if (!ownerId) {
    session = null
    sessionChange = sessionChange.then(async () => {
      const db = await openDatabase()
      if (db) await transaction(db, 'readwrite', store => { store.clear() })
    }).catch(() => {})
    return
  }
  const next: CacheSession = { ownerId, identity: Promise.resolve(undefined) }
  session = next
  next.identity = sessionChange.then(() => prepareIdentity(ownerId, () => session === next)).catch(() => undefined)
  sessionChange = next.identity.then(() => undefined)
}

function additionalData(identity: Identity, slot: Slot, writtenAt: number) {
  return encoder.encode(JSON.stringify([identity.generation, identity.ownerId, slot, writtenAt]))
}

export async function readChatSnapshot<T>(ownerId: string, slot: Slot): Promise<T | undefined> {
  const active = session
  if (active?.ownerId !== ownerId) return
  try {
    const identity = await active.identity
    const db = await openDatabase()
    if (!db || !identity || session !== active) return
    const record = await transaction<Snapshot>(db, 'readonly', (store, output) => {
      const lookup = store.get('identity')
      lookup.onsuccess = () => {
        if ((lookup.result as Identity | undefined)?.generation !== identity.generation) return
        const snapshot = store.get(slot)
        snapshot.onsuccess = () => {
          const record = snapshot.result as StoredSnapshot | undefined
          if (record && !('removed' in record) && Date.now() - record.writtenAt < lifetimeMs) output(record)
        }
      }
    })
    if (!record || session !== active) return
    const plaintext = await crypto.subtle.decrypt({
      name: 'AES-GCM', iv: record.iv, additionalData: additionalData(identity, slot, record.writtenAt),
    }, identity.key, record.ciphertext)
    if (session === active) return JSON.parse(decoder.decode(plaintext)) as T
  } catch {
    // The application can continue with the server when storage is unavailable or unreadable.
  }
}

export async function writeChatSnapshot<T>(ownerId: string, slot: Slot, value: T): Promise<void> {
  const active = session
  if (active?.ownerId !== ownerId) return
  const writtenAt = nextWriteTime()
  try {
    const identity = await active.identity
    const db = await openDatabase()
    if (!db || !identity || session !== active) return
    const json = JSON.stringify(value)
    if (json.length > maxSnapshotChars) return
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt({
      name: 'AES-GCM', iv, additionalData: additionalData(identity, slot, writtenAt),
    }, identity.key, encoder.encode(json))
    if (session !== active) return
    await transaction(db, 'readwrite', store => {
      const check = store.get('identity')
      check.onsuccess = () => {
        if (session !== active || (check.result as Identity | undefined)?.generation !== identity.generation) return
        const previous = store.get(slot)
        previous.onsuccess = () => {
          if (session !== active || ((previous.result as StoredSnapshot | undefined)?.writtenAt ?? 0) >= writtenAt) return
          store.put({ id: slot, writtenAt, iv, ciphertext } satisfies Snapshot)
          if (!slot.startsWith('thread:')) return
          let threadCount = 0
          const scan = store.index('writtenAt').openKeyCursor(null, 'prev')
          scan.onsuccess = () => {
            const cursor = scan.result
            if (!cursor) return
            if (typeof cursor.primaryKey === 'string' && cursor.primaryKey.startsWith('thread:')) {
              if (++threadCount > maxThreadSnapshots || writtenAt - Number(cursor.key) >= lifetimeMs) store.delete(cursor.primaryKey)
            }
            cursor.continue()
          }
        }
      }
    })
  } catch {
    // Caching must never block sending or displaying a committed message.
  }
}

export async function removeChatSnapshot(ownerId: string, slot: Slot) {
  const active = session
  if (active?.ownerId !== ownerId) return
  const writtenAt = nextWriteTime()
  try {
    const identity = await active.identity
    const db = await openDatabase()
    if (!identity || !db || session !== active) return
    await transaction(db, 'readwrite', store => {
      const check = store.get('identity')
      check.onsuccess = () => {
        if (session !== active || (check.result as Identity | undefined)?.generation !== identity.generation) return
        const current = store.get(slot)
        current.onsuccess = () => {
          if (((current.result as StoredSnapshot | undefined)?.writtenAt ?? 0) <= writtenAt) {
            // A queued encryption from another tab must not resurrect this snapshot.
            store.put({ id: slot, writtenAt, removed: true } satisfies RemovedSnapshot)
          }
        }
      }
    })
  } catch {
    // A later successful refresh replaces an unavailable local snapshot.
  }
}
