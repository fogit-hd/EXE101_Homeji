import assert from 'node:assert/strict'
import test from 'node:test'
import { activityDayLabel, groupActivitiesByDay } from '../src/lib/activityGroups.ts'

// 2026-11-24 10:00 in Vietnam (UTC+7).
const now = new Date('2026-11-24T03:00:00Z')

test('activity day labels follow the Vietnam calendar day', () => {
  assert.equal(activityDayLabel('2026-11-23T18:30:00Z', now), 'Hôm nay') // 01:30 on the 24th in Vietnam
  assert.equal(activityDayLabel('2026-11-23T10:00:00Z', now), 'Hôm qua')
  assert.equal(activityDayLabel('2026-11-20T10:00:00Z', now), '20/11/2026')
})

test('activities group into consecutive day sections in their given order', () => {
  const items = [
    { id: 1, occurredAt: '2026-11-24T02:00:00Z' },
    { id: 2, occurredAt: '2026-11-24T01:00:00Z' },
    { id: 3, occurredAt: '2026-11-23T05:00:00Z' },
    { id: 4, occurredAt: '2026-11-20T05:00:00Z' },
  ]
  const groups = groupActivitiesByDay(items, now)
  assert.deepEqual(groups.map(g => [g.label, g.items.map(i => i.id)]), [['Hôm nay', [1, 2]], ['Hôm qua', [3]], ['20/11/2026', [4]]])
})
