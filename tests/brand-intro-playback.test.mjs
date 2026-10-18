import assert from 'node:assert/strict'
import test from 'node:test'
import { brandIntroPlaybackRate, isAuthIntroPage } from '../src/lib/brandIntroPlayback.ts'

test('guest landing preserves the original intro pace', () => {
  assert.equal(brandIntroPlaybackRate('/', false), 1)
})

test('application reloads including authenticated home run at three times the speed', () => {
  assert.equal(brandIntroPlaybackRate('/', true), 3)
  for (const path of ['/explore', '/terms', '/privacy', '/payments/wait', '/admin', '/posts/123/edit']) {
    assert.equal(brandIntroPlaybackRate(path, false), 3)
    assert.equal(brandIntroPlaybackRate(path, true), 3)
  }
})

test('login and registration are excluded even with a trailing slash', () => {
  for (const path of ['/login', '/login/', '/register', '/register/']) {
    assert.equal(isAuthIntroPage(path), true)
    assert.equal(brandIntroPlaybackRate(path, true), 1)
    assert.equal(brandIntroPlaybackRate(path, false), 1)
  }
  assert.equal(isAuthIntroPage('/auth/callback'), false)
})

test('returning guest home also uses 3x speed', () => {
  assert.equal(brandIntroPlaybackRate('/', false, true), 3)
})
