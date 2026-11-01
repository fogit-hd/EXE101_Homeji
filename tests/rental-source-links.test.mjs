import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
const source=(await readFile(new URL('../src/api/rentalSources.ts',import.meta.url),'utf8')).replace("import { apiRequest } from './client'",'const apiRequest=()=>{throw Error("No API request expected")}')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {rentalSourceHref,rentalSourceImageHref,rentalSourceLabel}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
test('source references support Phongtro.vn with original HTTPS gallery images',()=>{
 assert.equal(rentalSourceHref('https://phongtro.vn/cho-thue-phong-tro/330425'),'https://phongtro.vn/cho-thue-phong-tro/330425')
 assert.equal(rentalSourceImageHref('https://file.phongtro.vn/2/photo.jpg'),'https://file.phongtro.vn/2/photo.jpg')
 assert.equal(rentalSourceLabel('phongtrovn'),'Phongtro.vn')
})
test('source and image links reject credentials, foreign origins, nonstandard ports and HTTP',()=>{
 for(const u of ['http://file.phongtro.vn/photo.jpg','https://file.phongtro.vn.evil.invalid/photo.jpg','https://user@file.phongtro.vn/photo.jpg','https://file.phongtro.vn:444/photo.jpg'])assert.equal(rentalSourceImageHref(u),null)
 for(const u of ['https://phongtro.vn.evil.invalid/room','https://user@phongtro.vn/room','https://phongtro.vn:444/room'])assert.equal(rentalSourceHref(u),null)
})
