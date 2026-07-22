import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldShowPersistentLoader } from '../src/components/persistentLoadingState.ts'

test('a completed data request is not held by an animation callback that a skeleton cannot emit', () => {
  assert.equal(shouldShowPersistentLoader(false, false, true), false)
})

test('loading and service disruption both keep the loading surface visible', () => {
  assert.equal(shouldShowPersistentLoader(true, false, true), true)
  assert.equal(shouldShowPersistentLoader(false, true, true), true)
})
