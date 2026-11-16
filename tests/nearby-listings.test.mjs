import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(
  new URL('../src/components/landing/explore/nearbyListings.ts', import.meta.url),
  'utf8',
)
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText
  .replace(
    /from ['"][^'"]*\/api(?:\/rentalSources)?['"]/g,
    'from "data:text/javascript,export const rentalSourceImageHref=(u)=>u"',
  )
  .replace(
    /from ['"][^'"]*sourcePublisherLinks['"]/g,
    'from "data:text/javascript,export const sourcePublisherLink=()=>undefined"',
  )

const { haversineKm, mergeNearby, formatDistanceVi } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
)

const center = { lat: 10.87, lng: 106.8 }

test('haversineKm is zero at the same point and grows with distance', () => {
  assert.equal(haversineKm(center, center), 0)
  const near = haversineKm(center, { lat: 10.871, lng: 106.8 })
  const far = haversineKm(center, { lat: 10.9, lng: 106.85 })
  assert.ok(near > 0 && near < 0.2)
  assert.ok(far > near)
})

test('mergeNearby merges, drops missing coords, dedupes, sorts, and filters radius', () => {
  const posts = [
    {
      id: 'a',
      title: 'Gần',
      price: 3e6,
      area: 20,
      address: 'A',
      latitude: 10.871,
      longitude: 106.8,
      thumbnailPath: null,
      type: 1,
      viewCount: 0,
      saveCount: 0,
      isOwnerVerified: true,
    },
    {
      id: 'far',
      title: 'Xa',
      price: 3e6,
      area: 20,
      address: 'B',
      latitude: 11.2,
      longitude: 107.2,
      thumbnailPath: null,
      type: 1,
      viewCount: 0,
      saveCount: 0,
    },
    {
      id: 'nocoords',
      title: 'Không tọa độ',
      price: 3e6,
      area: 20,
      address: 'C',
      latitude: 0,
      longitude: 0,
      thumbnailPath: null,
      type: 1,
      viewCount: 0,
      saveCount: 0,
    },
  ]
  const sources = [
    {
      id: 'a',
      source: 'mogi',
      sourceId: '1',
      sourceUrl: 'https://mogi.vn/x',
      title: 'Trùng id Homeji',
      address: 'A',
      district: '',
      price: 1,
      area: 10,
      imageUrls: [],
      sourceUpdatedAt: null,
      collectedAt: '2024-01-01',
      latitude: 10.8715,
      longitude: 106.8005,
    },
    {
      id: 's1',
      source: 'mogi',
      sourceId: '2',
      sourceUrl: 'https://mogi.vn/y',
      title: 'Nguồn gần',
      address: 'D',
      district: '',
      price: 2e6,
      area: 18,
      imageUrls: ['https://cloud.mogi.vn/photo.jpg'],
      sourceUpdatedAt: null,
      collectedAt: '2024-01-01',
      latitude: 10.872,
      longitude: 106.801,
    },
    {
      id: 's2',
      source: 'mogi',
      sourceId: '3',
      sourceUrl: 'https://mogi.vn/z',
      title: 'Nguồn thiếu tọa độ',
      address: 'E',
      district: '',
      price: 2e6,
      area: 18,
      imageUrls: [],
      sourceUpdatedAt: null,
      collectedAt: '2024-01-01',
      latitude: null,
      longitude: null,
    },
  ]

  const merged = mergeNearby(posts, sources, center, 2)
  assert.equal(merged.some(item => item.id === 'far'), false)
  assert.equal(merged.some(item => item.id === 'nocoords'), false)
  assert.equal(merged.some(item => item.id === 's2'), false)
  assert.equal(merged.filter(item => item.id === 'a').length, 1)
  assert.equal(merged[0].kind, 'homeji')
  assert.ok(merged.some(item => item.id === 's1' && item.kind === 'source'))
  for (let i = 1; i < merged.length; i++) {
    assert.ok(merged[i].distanceKm >= merged[i - 1].distanceKm)
  }
})

test('formatDistanceVi uses meters under 1 km and comma decimals', () => {
  assert.equal(formatDistanceVi(0.65), 'cách 650 m')
  assert.equal(formatDistanceVi(0.9996), 'cách 1 km')
  assert.equal(formatDistanceVi(1.2), 'cách 1,2 km')
  assert.equal(formatDistanceVi(2), 'cách 2 km')
})

test('mergeNearby drops synthetic Homeji posts', () => {
  const posts = [
    {
      id: 'real',
      title: 'Thật',
      price: 3e6,
      area: 20,
      address: 'A',
      latitude: 10.871,
      longitude: 106.8,
      thumbnailPath: null,
      type: 1,
      viewCount: 0,
      saveCount: 0,
      isSynthetic: false,
    },
    {
      id: 'fake',
      title: 'Giả',
      price: 3e6,
      area: 20,
      address: 'B',
      latitude: 10.8712,
      longitude: 106.8002,
      thumbnailPath: null,
      type: 1,
      viewCount: 0,
      saveCount: 0,
      isSynthetic: true,
    },
  ]
  const merged = mergeNearby(posts, [], center, 2)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].id, 'real')
})
