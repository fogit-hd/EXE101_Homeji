import assert from 'node:assert/strict'
import test from 'node:test'
import { sortConversationsByActivity, updateConversationAfterSend } from '../src/lib/conversationOrder.ts'

const conversation = (id, updatedAt, createdAt = updatedAt) => ({ id, updatedAt, createdAt, lastMessage: 'Tin nhắn', lastMessageSenderId: 'peer' })
const ids = items => items.map(item => item.id)

test('newest incoming and outgoing activity wins independently of server response order', () => {
  const items = [conversation('older', '2026-11-01T06:00:00Z'), conversation('newest', '2026-11-01T08:00:00Z'), conversation('middle', '2026-11-01T07:00:00Z')]
  assert.deepEqual(ids(sortConversationsByActivity(items)), ['newest', 'middle', 'older'])
  assert.deepEqual(ids(items), ['older', 'newest', 'middle'])
})

test('opening a recipient does not change message activity; only a confirmed message moves it', () => {
  const items = [conversation('chosen', '2026-11-01T06:00:00Z'), conversation('peer', '2026-11-01T07:00:00Z')]
  assert.deepEqual(ids(sortConversationsByActivity(items)), ['peer', 'chosen'])
  const sent = updateConversationAfterSend(items, { id: 'sent', conversationId: 'chosen', senderId: 'me', body: 'Xin chào', sentAt: '2026-11-01T08:00:00Z' })
  assert.deepEqual(ids(sent), ['chosen', 'peer'])
  assert.equal(items[0].updatedAt, '2026-11-01T06:00:00Z')
})

test('empty conversations cannot outrank sent/received messages even with a newer creation/update timestamp', () => {
  const items = [conversation('active', '2026-11-01T06:00:00Z'), { ...conversation('empty', '2026-11-26T08:00:00Z'), lastMessage: null, lastMessageSenderId: null }]
  assert.deepEqual(ids(sortConversationsByActivity(items)), ['active', 'empty'])
  assert.deepEqual(ids(updateConversationAfterSend(items, { id: 'media', conversationId: 'empty', senderId: 'me', body: '', sentAt: '2026-11-26T08:01:00Z' })), ['empty', 'active'])
})

test('late upload completion never regresses the inbox preview or timestamp', () => {
  const latest = conversation('same', '2026-11-26T08:02:00Z')
  const [result] = updateConversationAfterSend([latest], { id: 'upload', conversationId: 'same', senderId: 'me', body: 'Ảnh', sentAt: '2026-11-26T08:01:00Z' })
  assert.equal(result, latest)
})

test('malformed legacy timestamps fall back to creation time and ties stay deterministic', () => {
  const items = [conversation('z', 'invalid'), conversation('b', 'invalid', '2026-11-01T08:00:00Z'), conversation('a', '2026-11-01T08:00:00Z')]
  assert.deepEqual(ids(sortConversationsByActivity(items)), ['a', 'b', 'z'])
})
