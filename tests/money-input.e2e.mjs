import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {chromium} from 'playwright'
import {mkdir,writeFile} from 'node:fs/promises'
const base=process.env.HOMEJI_TEST_BASE_URL||'http://127.0.0.1:5202'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only')
const out='output/verification/money-and-transfer';await mkdir(out,{recursive:true})
await writeFile(out+'/fixture.html','<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./fixture.tsx"></script></html>')
await writeFile(out+'/fixture.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MoneyInput}from'/src/components/ui/MoneyInput.tsx';import '/src/index.css';function F(){const[v,setV]=useState('');return <main style={{padding:24}}><label htmlFor="money">Tiền thuê</label><MoneyInput id="money" value={v} onValueChange={setV} required/><output>{v}</output></main>};createRoot(document.getElementById('root')).render(<F/>);`)
const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage()
try{await p.goto(base+'/'+out+'/fixture.html');const input=p.getByLabel('Tiền thuê');await input.fill('1500000');assert.equal(await input.inputValue(),'1.500.000');assert.equal(await p.locator('output').textContent(),'1500000');await input.fill('25.000.000');assert.equal(await input.inputValue(),'25.000.000');assert.equal(await p.locator('output').textContent(),'25000000');await input.fill('1234567');await input.press('Home');await input.press('ArrowRight');await input.press('Delete');assert.equal(await p.locator('output').textContent(),'1234567');await input.fill('');assert.equal(await input.inputValue(),'');console.log('PASS: money grouping and raw digits, paste, clearing, separator deletion');}finally{await b.close()}
