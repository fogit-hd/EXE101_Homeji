import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSpiderfyPositions,
  shouldSpiderfyCluster,
} from '../src/lib/mapSpiderfy.ts'

test('overlapping map pins expand into distinct positions around their real location', () => {
  const center = { lat: 10.842, lng: 106.81 }
  const positions = createSpiderfyPositions(center, 5, 17)

  assert.equal(positions.length, 5)
  assert.equal(new Set(positions.map((position) => `${position.lat},${position.lng}`)).size, 5)
  assert.ok(positions.every((position) => position.lat !== center.lat || position.lng !== center.lng))
})

test('exact overlaps spiderfy at any zoom while normal clusters first zoom closer', () => {
  const same = { lat: 10.842, lng: 106.81 }
  assert.equal(shouldSpiderfyCluster([same, same], 13), true)
  assert.equal(shouldSpiderfyCluster([same, { lat: 10.843, lng: 106.81 }], 13), false)
  assert.equal(shouldSpiderfyCluster([same, { lat: 10.843, lng: 106.81 }], 16), true)
})
