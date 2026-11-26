import assert from 'node:assert/strict'
import test from 'node:test'
import { createHomieModel } from '../src/components/auth/homieModel.ts'

function withModel(check) {
 const model=createHomieModel()
 try {check(model)} finally {
  const geometry=new Set(),materials=new Set()
  model.root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)})
  for(const g of geometry)g.dispose();for(const m of materials)m.dispose()
 }
}
const pointer={x:0,y:0}
function settle(model,state,start=100,reduced=false){for(let i=0;i<40;i++)model.update(state,.5,pointer,start+i*.03,.03,reduced)}

test('Homie covers both eyes for password and peek, then returns both hands to rest',()=>withModel(model=>{
 for(const state of ['password','peek']){
  settle(model,state)
  for(const name of ['hand-left','hand-right']){const hand=model.root.getObjectByName(name);assert.ok(hand.position.y>1.75&&hand.position.z>.75,'Hands must reach the eyes')}
 }
 settle(model,'idle',114)
 for(const name of ['hand-left','hand-right']){const hand=model.root.getObjectByName(name);assert.ok(hand.position.y<1.2&&hand.position.z<.5,'The eye-cover pose must release completely')}
}))

test('Homie curiosity and success have distinct real geometry poses',()=>withModel(model=>{
 settle(model,'error');assert.ok(model.root.getObjectByName('homie-house').rotation.x>.04,'Error gently lowers the face')
 for(let i=0;i<40;i++)model.update('typing',1,pointer,110+i*.03,.03,false)
 assert.ok(model.root.getObjectByName('homie-house').rotation.y>.03,'Typing progress moves the head along the field')
 settle(model,'submitting')
 assert.ok(model.root.getObjectByName('homie-house').rotation.z<-.04,'Waiting leans the house inquisitively')
 model.update('success',.5,pointer,200,.03,false);model.update('success',.5,pointer,200.4,.05,false)
 assert.ok(model.root.position.y>.2,'Success includes one small celebratory hop')
 settle(model,'success',200.4)
 assert.ok(model.root.getObjectByName('hand-left').position.y>1.8)
 assert.ok(model.root.getObjectByName('closed-eye-1').visible,'Success has smiling eyes')
}))

test('Homie reduced motion preserves meaningful poses without idle bob or success jump',()=>withModel(model=>{
 settle(model,'password',100,true);assert.ok(model.root.getObjectByName('hand-right').position.y>1.75)
 settle(model,'success',101,true);assert.equal(model.root.position.y,0)
 settle(model,'idle',114,true);assert.equal(model.root.position.y,0);assert.ok(model.root.getObjectByName('hand-right').position.y<1.2)
}))
