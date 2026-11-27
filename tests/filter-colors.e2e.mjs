import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
const out='output/verification/filter-colors';await mkdir(out,{recursive:true})
const source=await readFile('output/verification/listing-amenities/scene.tsx','utf8')
await writeFile(out+'/scene.tsx',`import {LiquidGlassEffects} from '/src/components/ui/LiquidGlassEffects.tsx';`+source.replace('</MemoryRouter>','<LiquidGlassEffects/></MemoryRouter>'))
await writeFile(out+'/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{for(const theme of ['light','dark'])for(const width of [1440,390,320]){
 const p=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'})
 await p.route('**/src/contexts/AuthContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1}})'}))
 await p.route('**/src/contexts/AuthModalContext.logic.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{}})'}))
 await p.route('**/api/**',r=>new URL(r.request().url()).pathname.startsWith('/api/')?r.fulfill({json:[]}):r.continue())
 await p.goto(`http://localhost:5194/${out}/index.html?workspace=1&view=list`)
 await p.waitForFunction(()=>getComputedStyle(document.body).margin==='0px')
 await p.evaluate(t=>{document.documentElement.dataset.theme=t;document.querySelector('.app-shell').classList.add('app-shell--authed')},theme)
 await p.getByRole('button',{name:'Bộ lọc',exact:true}).click()
 const sheet=width<768?p.locator('dialog.m-filter-sheet[open]'):p.locator('.map-listings__filter-sheet')
 await sheet.waitFor()
 // Include the real glass registration and its generic hover rules.
 const contrast=async button=>button.evaluate(e=>{
   const c=getComputedStyle(e),rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number),lum=s=>rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)
   let n=e,bg=c.backgroundColor;while(bg==='rgba(0, 0, 0, 0)'&&n.parentElement){n=n.parentElement;bg=getComputedStyle(n).backgroundColor}const l=[lum(c.color),lum(bg)].sort((a,b)=>b-a);return {ratio:(l[0]+.05)/(l[1]+.05),color:c.color,bg}
 })
 const check=async(b,name)=>{await b.scrollIntoViewIfNeeded();await p.mouse.move(0,0);const normal=await contrast(b);assert.ok(normal.ratio>=4.5,`${theme}/${width} ${name} normal ${JSON.stringify(normal)}`);await b.hover();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const hover=await contrast(b);assert.ok(hover.ratio>=4.5,`${theme}/${width} ${name} hover ${JSON.stringify(hover)}`)}
 const preset=sheet.locator('.map-listings__quick-chips').first().getByRole('button').first()
 await check(preset,'inactive price')
 await preset.click();await check(preset,'selected price')
 await check(sheet.locator('.map-listings__quick-chips').nth(1).getByRole('button').first(),'campus')
 await check(sheet.locator('.map-listings__sheet-save'),'save search')
 await check(sheet.locator('.map-listings__sheet-apply'),'apply results')
 const save=await sheet.locator('.map-listings__sheet-save').boundingBox(),apply=await sheet.locator('.map-listings__sheet-apply').boundingBox(),reset=await sheet.locator('.map-listings__sheet-reset').boundingBox()
 assert.ok(Math.abs(save.y-apply.y)<1 && Math.abs(save.height-apply.height)<1,'Save search and apply results share row and height')
 assert.ok(save.x+save.width<=apply.x,'Buttons do not overlap')
 assert.ok(await sheet.locator('.map-listings__sheet-reset').evaluate(e=>!!e.closest('.map-listings__sheet-heading, .m-sheet__head')),'Reset sits in the heading')
 assert.ok(reset.y+reset.height<save.y,'Reset leaves the compact footer to save/apply')
 assert.ok(apply.x+apply.width<=width,'Footer actions fit narrow screen')

 await sheet.locator('.map-listings__sheet-apply').focus()
 await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab')
 assert.ok(await sheet.locator('.map-listings__sheet-apply').evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),'Keyboard focus visible')
 await p.screenshot({path:`${out}/${width}-${theme}.png`})
 await p.close()
}console.log('PASS filter inactive/selected/default/hover >=4.5:1, save/apply, keyboard focus; glass enabled, light/dark, desktop/mobile')}finally{await browser.close()}
