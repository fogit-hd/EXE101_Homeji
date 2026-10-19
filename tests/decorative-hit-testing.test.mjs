import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import postcss from 'postcss'

const roots=['src/liquid-glass.css','src/components/ui/LiquidTabList.css','src/components/motion/interaction-motion.css','src/ai-spectrum.css','src/components/theme/theme.css'].map(file=>postcss.parse(fs.readFileSync(file,'utf8')))
for(const selector of ['.liquid-glass-defs','.interaction-feedback','.interaction-pulse','.ai-interaction-waves','.theme-water-layer','html[data-theme-transition]::view-transition','#root .liquid-tabs > .liquid-tabs__lens']) {
  test(`${selector} never captures pointer input`,()=>{
    const declarations=[]
    for(const root of roots)root.walkRules(rule=>{
      if(rule.selectors.includes(selector))rule.walkDecls('pointer-events',declaration=>declarations.push(declaration.value))
    })
    assert.ok(declarations.length,'Missing explicit non-interactive decoration contract')
    assert.ok(declarations.every(value=>value==='none'))
  })
}
test('unsupported backdrop filters keep opaque semantic surfaces',()=>{
  const css=roots[0]
  let fallback=false
  css.walkAtRules('supports',rule=>{
    if(rule.params.startsWith('not') && rule.params.includes('backdrop-filter'))
      rule.walkDecls('--glass-panel',declaration=>{fallback=declaration.value==='var(--surface-elevated)'})
  })
  assert.ok(fallback)
})

test('optical faces stay separate from the base material and content exclusions stay explicit',()=>{
  roots[0].walkRules(rule=>assert.ok(!rule.selector.includes('data-glass-face')))
  const effect=fs.readFileSync('src/components/ui/LiquidGlassEffects.tsx','utf8')
  assert.match(effect,/const contentControls = /)
  assert.ok(effect.includes("element.matches(contentControls)"))
})
