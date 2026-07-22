import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldBlockProtectedRoutes } from '../src/contexts/authLoadingState.ts'

test('protected routes stop blocking after initial auth even when profile refresh is disrupted', () => {
  assert.equal(shouldBlockProtectedRoutes(false, true), false)
})

test('protected routes remain blocked while the initial session check is running', () => {
  assert.equal(shouldBlockProtectedRoutes(true, false), true)
})
