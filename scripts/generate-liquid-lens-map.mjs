import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

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

// R/G normals follow a capsule, not an ellipse stretched to fit each button.
// Divide horizontal displacement by aspect ratio because SVG objectBoundingBox
// scales X by width and Y by height. This keeps the rim depth stable in pixels.
for (const ratio of [1, 2, 3, 4, 6, 10]) {
  const width = ratio === 1 ? 128 : ratio === 2 ? 160 : 192
  const height = Math.max(32, Math.round(width / ratio))
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x / (width - 1) * ratio
      const py = y / (height - 1)
      const cx = Math.max(.5, Math.min(ratio - .5, px))
      const dx = px - cx, dy = py - .5
      const distance = Math.hypot(dx, dy)
      const radius = Math.min(1, distance / .5)
      // The center is optically calm. Curvature rises through the outer rim.
      const rim = radius ** 5
      const offset = y * (width * 4 + 1) + 1 + x * 4
      rows[offset] = Math.round(127.5 - (distance ? dx / distance : 0) * rim * 98 / ratio)
      rows[offset + 1] = Math.round(127.5 - (distance ? dy / distance : 0) * rim * 98)
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
