import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import postcss from 'postcss'

const roots=['src/liquid-glass.css','src/components/ui/LiquidTabList.css','src/components/motion/interaction-motion.css','src/components/theme/theme.css'].map(file=>postcss.parse(fs.readFileSync(file,'utf8')))
for(const selector of ['.liquid-glass-defs','.interaction-feedback','.interaction-pulse','html[data-theme-transition]::view-transition','#root .liquid-tabs > .liquid-tabs__lens']) {
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
      rule.walkDecls('--glass-panel',declaration=>{fallback=['var(--surface)','var(--surface-elevated)'].includes(declaration.value)})
  })
  assert.ok(fallback)
})

test("glass registration is an explicit floating-layer allowlist", async () => {
  const scope=fs.readFileSync('src/components/ui/glassControlScope.ts','utf8')
  const candidates=scope.split('export const GLASS_CANDIDATES =')[1].split('\n')[0]
  assert.ok(!/button|input|textarea|select|actions/.test(candidates))
  assert.ok(scope.includes("return parentSurface ? 'skip' : 'lens'"))
  const entry=fs.readFileSync('src/main.tsx','utf8')
  assert.ok(!entry.includes('WebglButtonGlassEffects'))
  assert.ok(!entry.includes('ai-spectrum.css'))
})
