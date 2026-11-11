import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { cloudinaryResized, listingThumbSrcSet } from '../src/lib/cloudinaryImage.ts'

const upload = 'https://res.cloudinary.com/dv4y7cdpi/image/upload/f_webp,q_90/v1793865080/homeji/room.png#homeji-source-0'

test('Homeji uploads get a limit-resize ahead of their existing transformations', () => {
  assert.equal(
    cloudinaryResized(upload, 240),
    'https://res.cloudinary.com/dv4y7cdpi/image/upload/c_limit,w_240/f_webp,q_90/v1793865080/homeji/room.png#homeji-source-0',
  )
})

test('other hosts, other Cloudinary accounts, bad URLs and bad widths are left alone', () => {
  for (const url of ['https://cloud.mogi.vn/a.jpg', 'https://res.cloudinary.com/other/image/upload/a.jpg', 'http://res.cloudinary.com/dv4y7cdpi/image/upload/a.jpg', 'not a url']) {
    assert.equal(cloudinaryResized(url, 240), null, url)
    assert.equal(listingThumbSrcSet(url), undefined, url)
  }
  for (const width of [0, -10, 1.5, Number.NaN]) assert.equal(cloudinaryResized(upload, width), null)
})

test('srcSet lists every thumbnail width', () => {
  const srcSet = listingThumbSrcSet(upload)
  assert.match(srcSet, /c_limit,w_240\/.* 240w, .*c_limit,w_480\/.* 480w, .*c_limit,w_800\/.* 800w$/)
})

test('guest listing cards request sized thumbnails', () => {
  const card = readFileSync(new URL('../src/components/landing/GuestListingPreview.tsx', import.meta.url), 'utf8')
  assert.match(card, /srcSet=\{listingThumbSrcSet\(photos\[0\]\)\} sizes="\(max-width: 640px\) calc\(100vw - 48px\), 150px"/)
})
