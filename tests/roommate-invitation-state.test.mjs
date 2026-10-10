import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/roommates/roommateInvitationState.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { reconcileRoommateInvitations, upsertRoommateInvitation } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
const invitation = (id, status = 1, updatedAt = '2026-10-11T10:00:00Z') => ({ id, senderId: 'me', receiverId: 'other', status, updatedAt })
const deferred = () => {
  let resolve
  const promise = new Promise(complete => { resolve = complete })
  return { promise, resolve }
}
function stateHarness(initial = []) {
  let items = initial, revision = 0
  const mutationRevisions = new Map()
  return {
    snapshot(promise) {
      const snapshotRevision = revision
      return promise.then(snapshot => { items = reconcileRoommateInvitations(snapshot, items, snapshotRevision, mutationRevisions) })
    },
    acknowledge(item) { revision++; mutationRevisions.set(item.id, revision); items = upsertRoommateInvitation(items, item) },
    get items() { return items },
  }
}

test('a delayed pre-invite snapshot cannot remove the acknowledged connection', async () => {
  const state = stateHarness(), response = deferred()
  const loading = state.snapshot(response.promise)
  const created = invitation('new')
  state.acknowledge(created)
  response.resolve([])
  await loading
  assert.deepEqual(state.items, [created])
  assert.equal(state.items[0].senderId, 'me')
  assert.equal(state.items[0].receiverId, 'other')
})

test('snapshot resolving first and invite acknowledgement second also retains one invitation', async () => {
  const state = stateHarness(), response = deferred()
  const loading = state.snapshot(response.promise)
  response.resolve([])
  await loading
  state.acknowledge(invitation('new'))
  assert.deepEqual(state.items.map(item => item.id), ['new'])
})

test('a fresh post-mutation reload is authoritative, including cancellation and removal', async () => {
  const state = stateHarness()
  state.acknowledge(invitation('new'))
  const cancelled = invitation('new', 4, '2026-10-11T11:00:00Z')
  await state.snapshot(Promise.resolve([cancelled]))
  assert.deepEqual(state.items, [cancelled])
  await state.snapshot(Promise.resolve([]))
  assert.deepEqual(state.items, [])
})

test('idempotent accepted response replaces a pending row without duplicate or status regression', async () => {
  const pending = invitation('pair'), accepted = invitation('pair', 2, '2026-10-11T11:00:00Z')
  const state = stateHarness([pending]), response = deferred()
  const loading = state.snapshot(response.promise)
  state.acknowledge(accepted)
  state.acknowledge(accepted)
  response.resolve([pending])
  await loading
  assert.deepEqual(state.items, [accepted])
})

test('concurrent merge still accepts a newer server status for another invitation', () => {
  const old = invitation('existing'), newer = invitation('existing', 4, '2026-10-11T12:00:00Z')
  const created = invitation('new')
  assert.deepEqual(reconcileRoommateInvitations([newer], [old, created], 0, new Map([['new', 1]])), [newer, created])
})

test('an unrelated invitation removed by the server is never resurrected by another acknowledgement', async () => {
  const state = stateHarness([invitation('removed')]), response = deferred()
  const loading = state.snapshot(response.promise)
  const created = invitation('new')
  state.acknowledge(created)
  response.resolve([])
  await loading
  assert.deepEqual(state.items, [created])
})

test('a newer server status wins even for an invitation acknowledged during the load', async () => {
  const state = stateHarness(), response = deferred()
  const loading = state.snapshot(response.promise)
  state.acknowledge(invitation('new', 1))
  const accepted = invitation('new', 2, '2026-10-11T12:00:00Z')
  response.resolve([accepted])
  await loading
  assert.deepEqual(state.items, [accepted])
})
