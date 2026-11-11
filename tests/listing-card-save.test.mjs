import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const preview = read('../src/components/landing/GuestListingPreview.tsx')
const button = read('../src/components/landing/ListingSaveButton.tsx')
const css = read('../src/components/landing/GuestListingPreview.css')

test('Homeji posts get a save heart beside (not inside) the card button', () => {
  assert.match(preview, /<\/button>\s*\{item\.kind === 'post' \? <ListingSaveButton postId=\{item\.data\.id\}/)
})

test('guests are sent to sign in and the room is saved from the auth callback', () => {
  assert.match(button, /openAuthModal\(\{\s*intent: 'save',\s*onSuccess: \(\) => \{\s*savePost\(postId\)/)
  assert.match(button, /aria-pressed=\{saved\}/)
})

test('the heart does not start the card long-press wheel', () => {
  assert.match(button, /onPointerDown=\{isolate\}/)
  assert.match(button, /onContextMenu=\{isolate\}/)
})

test('phones show a full-width 16:9 photo with matching image sizes', () => {
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.guest-preview__card-open \{ display: flex; flex-direction: column; \}\s*\.guest-preview__photo \{ width: 100%; height: auto; min-height: 0; aspect-ratio: 16 \/ 9; \}/)
  assert.match(preview, /sizes="\(max-width: 640px\) calc\(100vw - 48px\), 150px"/)
})
