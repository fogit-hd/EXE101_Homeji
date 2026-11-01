import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const out='output/verification/amount-input'
await mkdir(out,{recursive:true})
await writeFile(`${out}/index.html`,'<html><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
await writeFile(`${out}/scene.tsx`, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MoneyInput}from'/src/components/ui/MoneyInput.tsx';function Scene(){const[value,setValue]=useState('');return <form onSubmit={e=>{e.preventDefault();document.querySelector('output').textContent=value}}><MoneyInput aria-label="Amount" value={value} onValueChange={setValue} min="1" max="1000000000" required/><button>Submit</button><output/><span id="raw">{value}</span></form>}createRoot(document.getElementById('root')).render(<Scene/>);`)
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:5541/${out}/index.html`)
 const input=page.getByLabel('Amount');await input.click()
 for(const [key,expected]of[['1','1'],['2','12'],['3','123'],['4','1.234'],['5','12.345'],['6','123.456'],['7','1.234.567']]){await input.press(key);assert.equal(await input.inputValue(),expected)}
 await page.getByRole('button').click();assert.equal(await page.locator('output').textContent(),'1234567')
 await input.evaluate(e=>{e.focus();e.setSelectionRange(2,2)});await input.press('Backspace');assert.equal(await input.inputValue(),'1.234.567')
 await input.fill('2.000.000');assert.equal(await page.locator('#raw').textContent(),'2000000')
 await input.evaluate(e=>{e.focus();e.setSelectionRange(1,1)});await input.press('5');assert.equal(await input.inputValue(),'25.000.000')
 await input.fill('1000000001');assert.equal(await input.evaluate(e=>e.checkValidity()),false)
 await input.fill('');assert.equal(await input.evaluate(e=>e.checkValidity()),false)
 await input.fill('0');assert.equal(await input.evaluate(e=>e.checkValidity()),false)
 console.log('PASS live grouping, raw submission, middle editing, separator backspace, paste, bounds and required validation')
}finally{await browser.close()}
