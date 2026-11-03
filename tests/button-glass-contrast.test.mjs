import assert from 'node:assert/strict'
import test from 'node:test'
import {reactDomModule} from './helpers/react-dom-module.mjs'
const {chooseGlassInk,glassContrast}=await import(reactDomModule('src/components/ui/buttonGlassPaint.ts'))
test('button ink stays readable across every neutral gray, including the midtone gap',()=>{
 for(let value=0;value<=255;value++){
  const face=Array(3).fill(value/255),ink=chooseGlassInk([.95,.98,1],face)
  assert.ok(glassContrast(ink,face)>=4.6,`Gray ${value} must have readable ink`)
 }
})
test('safe authored semantic ink is preserved and unsafe ink is repaired',()=>{
 const white=[1,1,1],teal=[.03,.3,.34],red=[.6,.08,.17]
 assert.deepEqual(chooseGlassInk(white,teal),white)
 assert.deepEqual(chooseGlassInk(white,red),white)
 assert.ok(glassContrast(chooseGlassInk(white,[1,1,1]),[1,1,1])>10)
 assert.ok(glassContrast(chooseGlassInk([0,0,0],[.03,.03,.03]),[.03,.03,.03])>10)
})
