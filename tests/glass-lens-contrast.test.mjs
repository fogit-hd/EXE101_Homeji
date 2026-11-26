import assert from 'node:assert/strict'
import test from 'node:test'
import { THEMES, contrast, mix, token, tokenContrast } from './helpers/theme-tokens.mjs'
import { readFile } from 'node:fs/promises'

// WCAG relative luminance calculation
function relLuminance(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB
}

function contrastRatio(l1, l2) {
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

test("SVG enhancement uses one neutral displacement without dispersion", async () => {
  const content = await readFile(new URL('../src/components/ui/glassLensFilters.ts', import.meta.url), 'utf8')
  assert.equal((content.match(/createElementNS\(svg, 'feDisplacementMap'\)/g) || []).length, 1)
  assert.doesNotMatch(content, /feColorMatrix|feBlend|dispersed-|channel-red/)
  assert.match(content, /scale: '2'/)
})

test('MarketplaceHeader utility actions define readable text colors and glass control overrides', async () => {
  const css = await readFile(new URL('../src/components/marketplace/MarketplaceHeader.css', import.meta.url), 'utf8')
  // Check text color declaration in utility action rule
  assert.match(css, /\.marketplace-header__utility-action[\s\S]*?\{[^}]*color:\s*var\(--text-heading\)/, 'Utility action must use readable heading text')
  // Check data-glass-control override protection on base and modifier rules
  assert.match(css, /\.marketplace-header__utility-action\[data-glass-control\]/, 'Utility action must protect styles when data-glass-control is set')
  // Theme follows the surface/text tokens, so dark mode needs no separate rule
  assert.match(css, /\.marketplace-header__utility-action\[data-glass-control\][\s\S]*?\{[^}]*background:\s*var\(--surface\)/, 'Utility action must sit on the themed surface token')
  // Mobile responsive min-width override covers data-glass-control
  assert.match(css, /@media\s*\(max-width:\s*720px\)[\s\S]*?\.marketplace-header__utility-action\[data-glass-control\][\s\S]*?min-width:\s*0/, 'Mobile layout must allow shrinking when data-glass-control is set')
  // Accessibility and forced colors fallbacks cover data-glass-control
  assert.match(css, /@media\s*\(forced-colors:active\),\s*\(prefers-reduced-transparency:reduce\),\s*\(prefers-contrast:more\)[\s\S]*?\.marketplace-header__utility-action\[data-glass-control\][\s\S]*?backdrop-filter:\s*none/, 'A11y fallbacks must disable backdrop-filter on data-glass-control')
  assert.match(css, /@media\s*\(forced-colors:active\)[\s\S]*?\.marketplace-header__utility-action\[data-glass-control\][\s\S]*?background:\s*ButtonFace/, 'Forced colors must set ButtonFace background on data-glass-control')
})

test('MarketplaceHeader button text contrast meets WCAG AA standard (>= 4.5:1) in light and dark themes', () => {
  // Light mode: --text-heading is #221a14 (rgb(34, 26, 20)), frosted glass backdrop is ~rgb(255, 251, 244)
  const lightTextLum = relLuminance(34, 26, 20)
  const lightBgLum = relLuminance(255, 251, 244)
  const lightContrast = contrastRatio(lightBgLum, lightTextLum)
  assert.ok(lightContrast >= 4.5, `Light mode contrast ${lightContrast.toFixed(2)} must be >= 4.5:1`)

  // Dark mode: --text-heading is #f4ebde (rgb(244, 235, 222)), dark glass backdrop is ~rgb(31, 25, 20)
  const darkTextLum = relLuminance(244, 235, 222)
  const darkBgLum = relLuminance(31, 25, 20)
  const darkContrast = contrastRatio(darkTextLum, darkBgLum)
  assert.ok(darkContrast >= 4.5, `Dark mode contrast ${darkContrast.toFixed(2)} must be >= 4.5:1`)

  // Regression check: with broken offset 0, background was ~rgb(76, 76, 77)
  const brokenMudLum = relLuminance(76, 76, 77)
  const brokenContrast = contrastRatio(brokenMudLum, lightTextLum)
  assert.ok(brokenContrast < 2.0, `Broken offset 0 produced failing contrast of ${brokenContrast.toFixed(2)}:1`)
})

test("lenses share the readable material and opaque accessibility fallback", async () => {
  const css = await readFile(new URL('../src/glass-controls.css', import.meta.url), 'utf8')
  assert.match(css, /blur\(18px\) saturate\(1\.4\)/)
  assert.match(css, /background: var\(--glass-panel\) !important/)
  assert.match(css, /inset 0 1px 0 var\(--glass-edge\), 0 8px 24px var\(--glass-shadow\)/)
  for (const preference of ['prefers-reduced-transparency: reduce','prefers-contrast: more','prefers-reduced-motion: reduce']) assert.ok(css.includes(preference))
  assert.match(css, /@supports not[\s\S]*?background: var\(--surface\) !important/)
  assert.doesNotMatch(css, /radial-gradient|conic-gradient/)
  const effects = await readFile(new URL('../src/components/ui/LiquidGlassEffects.tsx', import.meta.url), 'utf8')
  assert.ok(effects.includes("preference.addEventListener('change', onPreference)"))
})

test('SegmentedTabs and MarketplaceHeader subtabs adhere to Liquid Glass V2 styling', async () => {
  const segCss = await readFile(new URL('../src/components/motion/SegmentedTabs.css', import.meta.url), 'utf8')
  assert.match(segCss, /\.segmented-tabs__pill[\s\S]*?background:\s*var\(--surface-elevated\)/, 'Content selection pills stay solid')
  assert.match(segCss, /\.segmented-tabs__pill::before[\s\S]*?padding:\s*1px/, 'SegmentedTabs pill must define 1px specular highlight rim')

  const headerCss = await readFile(new URL('../src/components/marketplace/MarketplaceHeader.css', import.meta.url), 'utf8')
  assert.match(headerCss, /\.marketplace-header__subtab[\s\S]*?background:\s*transparent/, 'MarketplaceHeader subtab must have transparent background override')
})

test('LiquidTabList active tab text meets WCAG AAA standard (>= 7.0:1) in light and dark themes', async () => {
  const css = await readFile(new URL('../src/components/ui/LiquidTabList.css', import.meta.url), 'utf8')
  // Verify --tabs-ink declarations
  assert.match(css, /--tabs-ink:\s*var\(--text-heading\)/, 'Tab ink follows the heading token in both themes')
  const ink = theme => token('--text-heading', theme).slice(1).match(/../g).map(v => parseInt(v, 16))

  // Light mode: heading ink against frosted track (~rgb(245, 248, 246))
  const lightInkLum = relLuminance(...ink('light'))
  const lightTrackLum = relLuminance(245, 248, 246)
  const lightContrast = contrastRatio(lightTrackLum, lightInkLum)
  assert.ok(lightContrast >= 7.0, `Light mode active tab contrast ${lightContrast.toFixed(2)}:1 must meet WCAG AAA (>= 7.0:1)`)

  // Dark mode: heading ink against dark track (~rgb(22, 40, 36))
  const darkInkLum = relLuminance(...ink('dark'))
  const darkTrackLum = relLuminance(22, 40, 36)
  const darkContrast = contrastRatio(darkInkLum, darkTrackLum)
  assert.ok(darkContrast >= 7.0, `Dark mode active tab contrast ${darkContrast.toFixed(2)}:1 must meet WCAG AAA (>= 7.0:1)`)
})


test('neutral SVG filter leases share geometry and release their DOM nodes', async () => {
  const { JSDOM } = await import('jsdom')
  const { reactDomModule } = await import('./helpers/react-dom-module.mjs')
  const { createGlassLensFilters } = await import(reactDomModule('src/components/ui/glassLensFilters.ts'))
  const previous = globalThis.document
  const dom = new JSDOM('<svg><defs></defs></svg>')
  globalThis.document = dom.window.document
  try {
    const defs = document.querySelector('defs')
    const map = { circle: '/map.png', vertical: '/stem.png', horizontal: '/stem-horizontal.png' }
    const bank = createGlassLensFilters(defs, { capsule: map, bead: map })
    const id = bank.acquire(80, 44, 2, 'tab-rest')
    assert.equal(bank.acquire(80, 44, 2, 'tab-rest'), id)
    assert.equal(defs.querySelectorAll('filter').length, 1)
    assert.equal(defs.querySelectorAll('feDisplacementMap').length, 1)
    assert.equal(defs.querySelectorAll('feColorMatrix,feBlend,feComposite').length, 0)
    bank.release(id)
    assert.equal(defs.children.length, 1)
    bank.release(id)
    assert.equal(defs.children.length, 0)
    bank.acquire(44, 44, 1, 'bead')
    bank.clear()
    assert.equal(defs.children.length, 0)
  } finally { globalThis.document = previous; dom.window.close() }
})

test('glass ink and secondary text retain AA over black, white and saturated backdrops', async () => {
  const css = await readFile(new URL('../src/liquid-glass.css', import.meta.url), 'utf8')
  const material = await readFile(new URL('../src/glass-controls.css', import.meta.url), 'utf8')
  const palette = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  const darkPalette = palette.slice(palette.indexOf("html[data-theme='dark'] {"))
  const rgb = hex => hex.match(/[\da-f]{2}/gi).map(v => parseInt(v,16))
  assert.match(css, /--glass-ink:\s*var\(--text-heading\)/)
  const inks = THEMES.map(theme => rgb(token('--text-heading', theme)))
  const muted = source => rgb(source.match(/--text-secondary:\s*#([\da-f]{6})/i)[1])
  const darkMedia = palette.slice(palette.indexOf('@media (prefers-color-scheme: dark)'))
  const tintDeclarations = [...css.matchAll(/--glass-(?:tint|panel):\s*color-mix\(in srgb, var\((--[\w-]+)\) ([\d.]+)%, transparent\)/g)]
  assert.deepEqual(tintDeclarations.slice(0,4).map(match => [match[1], Number(match[2])]), [['--surface',80],['--surface',86],['--surface',84],['--surface',88]])
  const tints = tintDeclarations.map((match, index) => [...rgb(token(match[1], index < 2 ? 'light' : 'dark')), Number(match[2]) / 100])
  assert.match(material, /background: var\(--glass-panel\) !important/)
  for (const [index, tint] of tints.entries()) {
    const foregrounds = index < 2 ? [inks[0], muted(palette)] : [inks[1], muted(darkPalette), muted(darkMedia)]
    for (const r of [0,255]) for (const g of [0,255]) for (const b of [0,255]) {
      const back = [r,g,b].map((value,i) => tint[i]*tint[3]+value*(1-tint[3]))
      for (const ink of foregrounds) {
        const ratio=contrastRatio(relLuminance(...ink),relLuminance(...back))
        assert.ok(ratio>=4.5, `${ink} on ${back}: ${ratio.toFixed(2)}:1`)
      }
    }
  }
})
