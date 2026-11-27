import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'
const { createRimPath } = await import(reactDomModule('src/components/map/listings/featured/rimTrail.ts'))

test('featured light trail follows the rounded border with uniform speed and a continuous loop seam', () => {
  for (const [width, height, radius] of [[340,560,14],[260,620,14],[480,530,14]]) {
    const path = createRimPath(width,height,radius), step = path.length / 2400
    for (let i=0;i<2400;i++) {
      const p=path.point(i*step), next=path.point((i+1)*step)
      const qx=Math.abs(p.x-width/2)-(width/2-radius), qy=Math.abs(p.y-height/2)-(height/2-radius)
      const error=Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-radius
      assert(Math.abs(error)<.02, 'Trail stays on the rounded border')
      const ratio=Math.hypot(next.x-p.x,next.y-p.y)/step
      assert(ratio>.99 && ratio<1.001, 'Corner and straight-edge speeds agree')
    }
    const first=path.point(0), last=path.point(path.length)
    assert(Math.hypot(first.x-last.x,first.y-last.y)<1e-8)
  }
})
