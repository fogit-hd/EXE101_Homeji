import assert from 'node:assert/strict'
import test from 'node:test'
import { sheetShouldExpand, previewPlacement } from '../src/components/map/listings/mapListingsLayout.ts'

test('sheet snaps only after a deliberate swipe in the requested direction', () => {
  assert.equal(sheetShouldExpand(false, -48), true)
  assert.equal(sheetShouldExpand(true, 48), false)
  assert.equal(sheetShouldExpand(false, -47), false)
  assert.equal(sheetShouldExpand(true, 0), true)
  assert.equal(sheetShouldExpand(true, -100), true)
  assert.equal(sheetShouldExpand(false, 100), false)
})
test('preview sits above the pin and flips below near the top', () => {
  assert.deepEqual(previewPlacement(300, 400, 600, 700, 280, 140), { left: 160, top: 236, below: false })
  assert.deepEqual(previewPlacement(300, 40, 600, 700, 280, 140), { left: 160, top: 64, below: true })
})
test('preview clamps at map edges and clears attribution', () => {
  assert.deepEqual(previewPlacement(4, 600, 375, 600, 280, 140), { left: 8, top: 428, below: false })
  assert.equal(previewPlacement(599, 400, 600, 700, 280, 140).left, 256)
})
