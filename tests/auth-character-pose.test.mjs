import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

test('password pose returns both arms to their original pose when focus leaves the field', async () => {
 const bytes = await readFile(new URL('../public/models/auth/RobotExpressive.glb', import.meta.url))
 const {scene:model} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
 const head=model.getObjectByName('Head')
 const arms=['L','R'].map(side=>{const upper=model.getObjectByName('UpperArm'+side),lower=model.getObjectByName('LowerArm'+side),palm=model.getObjectByName('Palm2'+side);return {upper,lower,palm,rest:[upper.quaternion.clone(),lower.quaternion.clone()],covered:null}})
 const source=await readFile(new URL('../src/components/auth/AuthCharacterScene.tsx',import.meta.url),'utf8')
 const start=source.indexOf('          arms.forEach((arm, index)'),end=source.indexOf('          renderer.render(scene, camera)',start)
 assert.ok(start>=0 && end>start)
 const resetStart=source.indexOf('          arms.forEach(({ upper, lower, rest })'); const resetEnd=source.indexOf('          if (!reduced.matches)',resetStart); const resetCode=resetStart<0?'':source.slice(resetStart,resetEnd);
 const code=ts.transpileModule(resetCode+source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
 const context={arms,model,head,reduced:{matches:false},conceal:1,end:new T.Vector3(),jointPosition:new T.Vector3(),from:new T.Vector3(),to:new T.Vector3(),target:new T.Vector3(),delta:new T.Quaternion(),parentRotation:new T.Quaternion(),worldRotation:new T.Quaternion(),closed:new T.Quaternion()}
 vm.runInNewContext(code,context)
 assert.ok(arms.some(arm=>arm.upper.quaternion.angleTo(arm.rest[0])>.1),'Password state must move the hands')
 context.conceal=0
 for(let frame=0;frame<60;frame++)vm.runInNewContext(code,context)
 for(const arm of arms){assert.ok(arm.upper.quaternion.angleTo(arm.rest[0])<.001,'Upper arm remains stuck covering the face');assert.ok(arm.lower.quaternion.angleTo(arm.rest[1])<.001,'Forearm remains stuck covering the face')}
})

