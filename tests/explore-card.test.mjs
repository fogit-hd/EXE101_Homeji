import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const saveSource = await readFile(
  new URL('../src/components/landing/explore/ExploreSaveButton.tsx', import.meta.url),
  'utf8',
)
const cardSource = await readFile(
  new URL('../src/components/landing/explore/ExploreListingCard.tsx', import.meta.url),
  'utf8',
)

test('guest save opens auth modal and saves the room after login', () => {
  assert.match(saveSource, /openAuthModal\(\{\s*intent:\s*'save'/)
  assert.match(saveSource, /onSuccess:\s*\(\)\s*=>\s*\{[\s\S]*savePost\(postId\)/)
  assert.match(saveSource, /if\s*\(!isAuthenticated\)/)
})

test('listing card image uses listingThumbSrcSet with sizes', () => {
  assert.match(cardSource, /listingThumbSrcSet/)
  assert.match(cardSource, /srcSet=\{listingThumbSrcSet\(thumb\)\}/)
  assert.match(cardSource, /sizes="\(max-width: 1023px\) 42vw, 128px"/)
})
