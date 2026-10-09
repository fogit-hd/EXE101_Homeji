import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/gallerySwipe.ts', import.meta.url), 'utf8')
const js = ts.transpile(source, { module: ts.ModuleKind.ESNext })
const { gallerySwipeDirection } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

test('horizontal swipe navigates once in the correct direction', () => {
  assert.equal(gallerySwipeDirection(-90, 10), 1)
  assert.equal(gallerySwipeDirection(90, 10), -1)
})
test('taps, vertical drags and malformed coordinates never change photos', () => {
  for (const [dx, dy] of [[12, 0], [0, 90], [60, 70], [NaN, 0], [Infinity, 0]]) {
    assert.equal(gallerySwipeDirection(dx, dy), 0)
  }
})
