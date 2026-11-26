import assert from 'node:assert/strict'
import test from 'node:test'
import { roomDetailParams } from '../src/lib/roomDetailParams.ts'

test('opening and closing room detail preserve every other parameter and input', () => {
  const previous = new URLSearchParams('section=saved&post=legacy&keyword=room&tag=a&tag=b')
  const opened = roomDetailParams(previous, 'room/1')
  assert.equal(opened.get('room'), 'room/1')
  assert.equal(previous.has('room'), false)
  assert.equal(roomDetailParams(opened, null).toString(), previous.toString())
  assert.equal(opened.get('room'), 'room/1')
})

test('direct room links can be replaced or closed without touching legacy links', () => {
  const direct = new URLSearchParams('post=legacy&source=source&room=first')
  assert.equal(roomDetailParams(direct, 'second').getAll('room').length, 1)
  assert.equal(roomDetailParams(direct, 'second').get('room'), 'second')
  assert.equal(roomDetailParams(direct, null).toString(), 'post=legacy&source=source')
  assert.equal(roomDetailParams(new URLSearchParams(), null).toString(), '')
})
