import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { capsuleLensField } from './lib/liquid-lens-field.mjs'

// Neutral R/G encodes zero displacement. A smooth radial normal field bends
// the sampled backdrop inward near the rim instead of adding random ripples.
function crc32(bytes) {
  let crc = -1
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ -1) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

// Encode equal physical units for both axes. Runtime filters use pixel scales
// based on control height; width never amplifies the vertical displacement.
for (const ratio of [1, 2, 3, 4, 6, 10]) {
  const height = 128
  const width = ratio * height
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x / (width - 1) * ratio
      const py = y / (height - 1)
      const field = capsuleLensField(px, py, ratio)
      const offset = y * (width * 4 + 1) + 1 + x * 4
      rows[offset] = Math.round((.5 + field.x) * 255)
      rows[offset + 1] = Math.round((.5 + field.y) * 255)
      rows[offset + 2] = 128
      rows[offset + 3] = 255
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4)
  header[8] = 8; header[9] = 6
  const file = ratio === 3 ? 'liquid-lens-map.png' : `liquid-lens-map-${ratio}.png`
  writeFileSync(new URL(`../src/components/ui/${file}`, import.meta.url), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
  ]))
}
