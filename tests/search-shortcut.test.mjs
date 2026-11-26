import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldHandleSearchShortcut } from '../src/lib/searchShortcut.ts'

test('slash search is available only outside editing and modal contexts', () => {
  assert.equal(shouldHandleSearchShortcut({ key: '/' }, false, false), true)
  assert.equal(shouldHandleSearchShortcut({ key: '/', shiftKey: true }, false, false), true)
  assert.equal(shouldHandleSearchShortcut({ key: '?' }, false, false), false)
  assert.equal(shouldHandleSearchShortcut({ key: '/' }, true, false), false)
  assert.equal(shouldHandleSearchShortcut({ key: '/' }, false, true), false)
  for (const flag of ['ctrlKey', 'metaKey', 'altKey', 'defaultPrevented', 'isComposing', 'repeat']) {
    assert.equal(shouldHandleSearchShortcut({ key: '/', [flag]: true }, false, false), false, flag)
  }
})
