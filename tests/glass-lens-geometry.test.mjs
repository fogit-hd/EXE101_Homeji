import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {inflateSync} from 'node:zlib'
import {nearestLensRatio,glassLensId} from '../src/components/ui/glassLensGeometry.ts'

test('lens shape follows round, capsule and wide controls',()=>{
 assert.equal(nearestLensRatio(44,44),1)
 assert.equal(nearestLensRatio(160,52),3)
 assert.equal(nearestLensRatio(720,48),10)
 assert.equal(glassLensId(3),'homeji-liquid-lens')
 assert.equal(glassLensId(1),'homeji-liquid-lens-1')
})

test('capsule maps leave the center calm and compensate horizontal width',async()=>{
 const displacement=[]
 for(const ratio of [1,2,3,4,6,10]){
  const file=ratio===3?'liquid-lens-map.png':`liquid-lens-map-${ratio}.png`
  const bytes=await readFile(new URL('../src/components/ui/'+file,import.meta.url))
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),parts=[]
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(type==='IDAT')parts.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12}
  const rows=inflateSync(Buffer.concat(parts)),stride=width*4+1
  const pixel=(x,y,channel)=>rows[y*stride+1+x*4+channel]
  assert.ok(Math.abs(pixel(width/2,Math.floor(height/2),0)-127.5)<=1)
  assert.ok(Math.abs(pixel(width/2,Math.floor(height/2),1)-127.5)<=1)
  assert.ok(pixel(0,Math.floor(height/2),0)>127.5)
  assert.ok(pixel(width-1,Math.floor(height/2),0)<127.5)
  assert.ok(pixel(width/2,0,1)>210)
  displacement.push((pixel(0,Math.floor(height/2),0)-127.5)*ratio)
 }
 // Quantization and capsule sampling vary slightly; long controls must never
 // amplify horizontal rim distortion in proportion to their full width.
 assert.ok(Math.max(...displacement)-Math.min(...displacement)<8)
})
