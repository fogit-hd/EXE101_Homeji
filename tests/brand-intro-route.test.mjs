import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { isBrandIntroLanding } from '../src/lib/brandIntroPlayback.ts'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const boot = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(script => script.includes('dataset.intro'))
assert.ok(boot, 'Exercise the actual inline pre-paint intro decision')
const requested = path => {
  const document = { documentElement: { dataset: {} } }
  runInNewContext(boot, { document, location: new URL(path, 'https://homeji.onrender.com') })
  const result = document.documentElement.dataset.intro === '1'
  assert.equal(isBrandIntroLanding(new URL(path, 'https://homeji.onrender.com')), result, 'React and pre-paint routing agree')
  return result
}

test('opening the bare home URL retains the intro', () => {
  assert.equal(requested('/'), true)
})

test('wallet, search and other home deep links never request a pre-paint intro', () => {
  for (const path of ['/?section=marketplace&market=wallet&wallet=history', '/?section=marketplace&market=wallet&wallet=withdraw', '/?section=profile', '/?section=listings', '/?post=room-123', '/?placeId=123', '/#help']) {
    assert.equal(requested(path), false, path)
  }
})

test('application paths, authentication and payment returns open without the intro', () => {
  for (const path of ['/login', '/register', '/explore', '/terms', '/privacy', '/marketplace', '/payments/wait?paymentId=123', '/auth/callback', '/posts/123']) {
    assert.equal(requested(path), false, path)
  }
})
