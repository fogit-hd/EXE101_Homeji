import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/pages/EditRentalPostPage.tsx', import.meta.url), 'utf8')
const handler = source.slice(source.indexOf('const handleAddMedia = async () => {'), source.indexOf('const handleDeleteMedia ='))

async function runUpload({ existing = 0, count = 3, failAt = 0, storageFails = false } = {}) {
  let visible = { media: Array.from({ length: existing }, (_, id) => ({ id })) }
  let persisted = visible
  let files = Array.from({ length: count }, (_, id) => ({ name: `qa-${id}.png` }))
  let error = ''
  let message = 'previous success'
  let uploading = false
  let calls = 0
  let selected = []
  const payloads = []
  const context = {
    postId: 'qa-only', profile: { id: 'qa-owner' }, post: visible,
    saving: false, uploadingMedia: false, mediaFiles: files,
    MediaType: { Image: 1 },
    setError: value => { error = value },
    setMessage: value => { message = value },
    setUploadingMedia: value => { uploading = value },
    setPost: value => { visible = value },
    setMediaFiles: value => { files = typeof value === 'function' ? value(files) : value },
    getErrorMessage: err => err.message,
    uploadImages: async (batch, folder) => {
      assert.equal(folder, 'rental-posts/qa-owner/qa-only')
      selected = batch
      if (storageFails) throw new Error('storage offline')
      return batch.map(file => ({ url: `https://res.cloudinary.com/qa/${file.name}` }))
    },
    addRentalPostMedia: async (_id, payload) => {
      payloads.push(payload)
      if (++calls === failAt) throw new Error('metadata offline')
      persisted = { media: [...persisted.media, { id: `added-${calls}`, ...payload }] }
      return persisted
    },
  }
  const upload = new Function(...Object.keys(context), `${handler}; return handleAddMedia`)(...Object.values(context))
  await upload()
  return { visible, files, error, message, uploading, selected, payloads }
}

test('confirmed images remain visible and leave the retry selection after a later attachment fails', async () => {
  const result = await runUpload({ failAt: 2 })
  assert.equal(result.visible.media.length, 1, 'the first confirmed attachment must not disappear')
  assert.deepEqual(result.files.map(file => file.name), ['qa-1.png', 'qa-2.png'])
  assert.equal(result.error, 'metadata offline')
  assert.equal(result.uploading, false)
  assert.equal(result.message, '', 'an old success message must not accompany this failure')
})

test('successful upload attaches each image in order with only the first thumbnail', async () => {
  const result = await runUpload()
  assert.equal(result.visible.media.length, 3)
  assert.equal(result.files.length, 0)
  assert.deepEqual(result.payloads.map(value => value.sortOrder), [0, 1, 2])
  assert.deepEqual(result.payloads.map(value => value.isThumbnail), [true, false, false])
  assert.ok(result.payloads.every(value => value.bucket === 'cloudinary'))
})

test('the ten-image limit leaves unprocessed selections intact', async () => {
  const result = await runUpload({ existing: 9 })
  assert.equal(result.selected.length, 1)
  assert.equal(result.visible.media.length, 10)
  assert.deepEqual(result.files.map(file => file.name), ['qa-1.png', 'qa-2.png'])
  assert.equal(result.payloads[0].isThumbnail, false)
  assert.equal(result.payloads[0].sortOrder, 9)
})

test('storage failure keeps the selection and performs no metadata writes', async () => {
  const result = await runUpload({ storageFails: true })
  assert.equal(result.files.length, 3)
  assert.equal(result.visible.media.length, 0)
  assert.equal(result.payloads.length, 0)
  assert.equal(result.error, 'storage offline')
  assert.equal(result.uploading, false)
})
