import assert from 'node:assert/strict'
import test from 'node:test'
import { sortConversationsByActivity } from '../src/lib/conversationOrder.ts'

const conversation = (id, updatedAt, createdAt = updatedAt) => ({ id, updatedAt, createdAt })
const ids = items => items.map(item => item.id)

test('newest incoming and outgoing activity wins independently of server response order', () => {
  const items = [conversation('older', '2026-11-01T06:00:00Z'), conversation('newest', '2026-11-01T08:00:00Z'), conversation('middle', '2026-11-01T07:00:00Z')]
  assert.deepEqual(ids(sortConversationsByActivity(items)), ['newest', 'middle', 'older'])
  assert.deepEqual(ids(items), ['older', 'newest', 'middle'])
})

test('a chosen recipient rises immediately, then a newer message takes priority without changing timestamps', () => {
  const items = [conversation('chosen', '2026-11-01T06:00:00Z'), conversation('peer', '2026-11-01T07:00:00Z')]
  const contactedAt = { chosen: Date.parse('2026-11-01T08:00:00Z') }
  assert.deepEqual(ids(sortConversationsByActivity(items, contactedAt)), ['chosen', 'peer'])
  assert.deepEqual(ids(sortConversationsByActivity([items[0], { ...items[1], updatedAt: '2026-11-01T08:01:00Z' }], contactedAt)), ['peer', 'chosen'])
  assert.equal(items[0].updatedAt, '2026-11-01T06:00:00Z')
})

test('malformed legacy timestamps fall back to creation time and ties stay deterministic', () => {
  const items = [conversation('z', 'invalid'), conversation('b', 'invalid', '2026-11-01T08:00:00Z'), conversation('a', '2026-11-01T08:00:00Z')]
  assert.deepEqual(ids(sortConversationsByActivity(items)), ['a', 'b', 'z'])
})
