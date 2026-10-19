import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {inflateSync} from 'node:zlib'
import {nearestLensRatio,glassLensId,GLASS_LENS_DEPTHS} from '../src/components/ui/glassLensGeometry.ts'

test('lens shape follows round, capsule and wide controls',()=>{
 assert.equal(nearestLensRatio(44,44),1)
 assert.equal(nearestLensRatio(160,52),3)
 assert.equal(nearestLensRatio(720,48),10)
 assert.equal(glassLensId(3),'homeji-liquid-lens')
 assert.equal(glassLensId(1),'homeji-liquid-lens-1')
 assert.equal(glassLensId(3,'tab-active'),'homeji-liquid-lens-active')
 assert.equal(glassLensId(2,'tab-active'),'homeji-liquid-lens-2-active')
 assert.equal(glassLensId(2,'tab-rest'),'homeji-liquid-lens-2-tab')
})

test('encoded lens maps bend opposite sides continuously without folding glyphs',async()=>{
 const maximumDepth=Math.max(...Object.values(GLASS_LENS_DEPTHS))
 for(const ratio of [1,2,3,4,6,10]){
  const file=ratio===3?'liquid-lens-map.png':`liquid-lens-map-${ratio}.png`
  const bytes=await readFile(new URL('../src/components/ui/'+file,import.meta.url))
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),parts=[]
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(type==='IDAT')parts.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12}
  const rows=inflateSync(Buffer.concat(parts)),stride=width*4+1
  const pixel=(x,y,channel)=>rows[y*stride+1+x*4+channel]
  const centerX=Math.floor(width/2),centerY=Math.floor(height/2)
  assert.ok(Math.abs(pixel(centerX,centerY,0)-127.5)<4)
  assert.ok(Math.abs(pixel(centerX,centerY,1)-127.5)<4)
  // No discontinuity where filtered and unfiltered images meet.
  assert.equal(pixel(centerX,0,1),128)
  assert.equal(pixel(centerX,height-1,1),128)
  assert.ok(pixel(centerX,Math.floor(height/4),1)>160)
  assert.ok(pixel(centerX,Math.floor(height*3/4),1)<95)
  assert.ok(pixel(Math.floor(height/4),centerY,0)>160)
  assert.ok(pixel(width-1-Math.floor(height/4),centerY,0)<95)
  // Check the decoded PNG, including 8-bit quantization, at the strongest profile.
  const dx=ratio/(width-1),dy=1/(height-1)
  for(let y=0;y<height-1;y++)for(let x=0;x<width-1;x++){
   const rx=maximumDepth*(pixel(x+1,y,0)-pixel(x,y,0))/255/dx
   const ry=maximumDepth*(pixel(x,y+1,0)-pixel(x,y,0))/255/dy
   const gx=maximumDepth*(pixel(x+1,y,1)-pixel(x,y,1))/255/dx
   const gy=maximumDepth*(pixel(x,y+1,1)-pixel(x,y,1))/255/dy
   assert.ok(1+rx>.5&&1+gy>.5&&(1+rx)*(1+gy)-ry*gx>.45,`folded sample at ratio ${ratio}, ${x},${y}`)
  }
 }
})
