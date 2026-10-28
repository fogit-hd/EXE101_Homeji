import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import postcss from 'postcss'

// Read the shipped declarations, including final appearance overrides. This guards
// specific foreground/background regressions; it does not replace browser visual QA.
const files = ['src/index.css','src/components/shell/shell.css','src/ui-consistency.css','src/liquid-glass.css','src/components/theme/dark-theme.css','src/pages/NotificationPopupList.css']
const roots = files.filter(f=>fs.existsSync(f)).map(f=>postcss.parse(fs.readFileSync(f,'utf8')))
const tokens = {}
for(const root of roots) root.walkRules(rule=>{
  if((rule.selector === ':root' && !rule.parent?.name) || rule.selector === "html[data-theme='dark']")
    rule.walkDecls(/^--/,d=>{tokens[d.prop]=d.value})
})
const resolve = value => value.replace(/var\((--[\w-]+)\)/g,(_,key)=>resolve(tokens[key]||'missing'))
function value(selectors,property){
  let found
  for(const root of roots) root.walkRules(rule=>{
    if(rule.selectors.some(s=>selectors.includes(s.trim())))rule.walkDecls(property,d=>{found=d.value})
  })
  assert.ok(found,`Missing declaration for ${selectors.join(',')} ${property}`)
  return resolve(found)
}
function luminance(hex){
  if(hex.startsWith('rgba(')){
    const [r,g,b,a]=hex.match(/[\d.]+/g).map(Number)
    const under=resolve(tokens['--surface-elevated']).slice(1).match(/../g).map(v=>parseInt(v,16))
    hex='#'+[r,g,b].map((v,i)=>Math.round(v*a+under[i]*(1-a)).toString(16).padStart(2,'0')).join('')
  }
  assert.match(hex,/^#[\da-f]{6}$/i)
  const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('dark menu links remain readable against their panel',()=>{
  const ink=value(['.hj-mega__link',"html[data-theme='dark'] #root .hj-mega__link"],'color')
  const panel=resolve(tokens['--surface-elevated'])
  const ratio=contrast(ink,panel)
  assert.ok(ratio>=4.5,`Menu contrast ${ratio.toFixed(2)} is below 4.5`)
  console.log(`Dark menu contrast: ${ratio.toFixed(2)}:1`)
})
test('dark information badges retain readable text',()=>{
  const ink=value(['.badge-blue',"html[data-theme='dark'] #root .badge-blue"],'color')
  const ratio=contrast(ink,resolve(tokens['--maps-blue-soft']))
  assert.ok(ratio>=4.5,`Information badge contrast ${ratio.toFixed(2)} is below 4.5`)
  console.log(`Dark information badge contrast: ${ratio.toFixed(2)}:1`)
})
test('secondary copy and input placeholders remain readable on elevated dark surfaces',()=>{
  assert.ok(contrast(resolve(tokens['--text-secondary']),resolve(tokens['--surface-elevated']))>=4.5)
  assert.ok(contrast('#afc1cd',resolve(tokens['--surface-input']))>=4.5)
})
test('unread notification text remains readable on its inherited dark surface',()=>{
  const background=value(['.hj-notify-feed .hj-nrow__main'],'background')
  const fill=background === 'transparent' ? resolve(tokens['--surface-elevated']) : background
  assert.ok(contrast(resolve(tokens['--text-primary']),fill)>=4.5)
  assert.ok(contrast(resolve(tokens['--text-secondary']),fill)>=4.5)
})
test('final appearance layer is dark scoped and loaded after the shared glass material',()=>{
  const root=postcss.parse(fs.readFileSync('src/components/theme/dark-theme.css','utf8'))
  root.walkRules(rule=>assert.ok(rule.selectors.every(selector=>selector.startsWith("html[data-theme='dark']")),rule.selector))
  const entry=fs.readFileSync('src/main.tsx','utf8')
  assert.ok(entry.indexOf("import './components/theme/dark-theme.css'")>entry.indexOf("import './liquid-glass.css'"))
})
