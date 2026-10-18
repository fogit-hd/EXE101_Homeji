import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

// Neutral R/G encodes zero displacement. A smooth radial normal field bends
// the sampled backdrop inward near the rim instead of adding random ripples.
const size = 128
const rows = Buffer.alloc((size * 4 + 1) * size)
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const u = (x + .5) / size * 2 - 1
    const v = (y + .5) / size * 2 - 1
    const radius = Math.hypot(u, v)
    const rim = Math.min(1, radius) ** 3
    const offset = y * (size * 4 + 1) + 1 + x * 4
    rows[offset] = Math.round(128 - u / Math.max(1, radius) * rim * 90)
    rows[offset + 1] = Math.round(128 - v / Math.max(1, radius) * rim * 90)
    rows[offset + 2] = 128
    rows[offset + 3] = 255
  }
}
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
const header = Buffer.alloc(13)
header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4)
header[8] = 8; header[9] = 6
writeFileSync(new URL('../src/components/ui/liquid-lens-map.png', import.meta.url), Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
  chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
]))
