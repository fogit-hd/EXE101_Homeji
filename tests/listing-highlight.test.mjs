import assert from 'node:assert/strict'
import test from 'node:test'
import { listingHighlight } from '../src/lib/listingHighlight.ts'

test('editorial tags cannot give non-Premium listings the Premium label', () => {
  assert.equal(listingHighlight({ highlightTag: ' Nổi bật ', isOwnerPremium: false }), null)
  assert.equal(listingHighlight({ highlightTag: 'NỔI BẬT' }), null)
  assert.equal(listingHighlight({ highlightTag: 'Nổi bật', isOwnerPremium: true }), 'Nổi bật')
})

test('other tags and missing tags keep their meaning', () => {
  assert.equal(listingHighlight({ highlightTag: ' Gần trường ' }), 'Gần trường')
  assert.equal(listingHighlight({ highlightTag: '   ' }), null)
  assert.equal(listingHighlight({}), null)
})
