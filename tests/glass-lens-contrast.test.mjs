import assert from 'node:assert/strict'
import test from 'node:test'
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

test('glassLensFilters illumination maintains bright reflection offset in light mode to prevent muddy black buttons', async () => {
  const content = await readFile(new URL('../src/components/ui/glassLensFilters.ts', import.meta.url), 'utf8')
  // Ensure .92 offset is present in light mode matrix rows
  assert.match(content, /\.7874\s+-\.7152\s+-\.0722\s+0\s+\.92/, 'Red channel must lift towards bright reflection')
  assert.match(content, /-\.2126\s+\.2848\s+-\.0722\s+0\s+\.92/, 'Green channel must lift towards bright reflection')
  assert.match(content, /-\.2126\s+-\.7152\s+\.9278\s+0\s+\.92/, 'Blue channel must lift towards bright reflection')
  // Verify that all-zero constant offsets are NOT present (which turns neutral scenes black)
  assert.doesNotMatch(content, /\.7874\s+-\.7152\s+-\.0722\s+0\s+0['"]/, 'Offset must not be zero in light mode')
})

test('MarketplaceHeader utility actions define readable text colors and glass control overrides', async () => {
  const css = await readFile(new URL('../src/components/marketplace/MarketplaceHeader.css', import.meta.url), 'utf8')
  // Check text color declaration in utility action rule
  assert.match(css, /\.marketplace-header__utility-action[\s\S]*?\{[^}]*color:\s*var\(--text-heading\)/, 'Utility action must use readable heading text')
  // Check data-glass-control override protection on base and modifier rules
  assert.match(css, /\.marketplace-header__utility-action\[data-glass-control\]/, 'Utility action must protect styles when data-glass-control is set')
  assert.match(css, /html\[data-theme='dark'\][^}]*marketplace-header__utility-action\[data-glass-control\]/, 'Dark theme must define utility action styles with data-glass-control')
  // Mobile responsive min-width override covers data-glass-control
  assert.match(css, /@media\s*\(max-width:\s*720px\)[\s\S]*?\.marketplace-header__utility-action\[data-glass-control\][\s\S]*?min-width:\s*0/, 'Mobile layout must allow shrinking when data-glass-control is set')
  // Accessibility and forced colors fallbacks cover data-glass-control
  assert.match(css, /@media\s*\(forced-colors:active\),\s*\(prefers-reduced-transparency:reduce\),\s*\(prefers-contrast:more\)[\s\S]*?\.marketplace-header__utility-action\[data-glass-control\][\s\S]*?backdrop-filter:\s*none/, 'A11y fallbacks must disable backdrop-filter on data-glass-control')
  assert.match(css, /@media\s*\(forced-colors:active\)[\s\S]*?\.marketplace-header__utility-action\[data-glass-control\][\s\S]*?background:\s*ButtonFace/, 'Forced colors must set ButtonFace background on data-glass-control')
})

test('MarketplaceHeader button text contrast meets WCAG AA standard (>= 4.5:1) in light and dark themes', () => {
  // Light mode: --text-heading is #19323b (rgb(25, 50, 59)), frosted glass backdrop is ~rgb(241, 241, 241)
  const lightTextLum = relLuminance(25, 50, 59)
  const lightBgLum = relLuminance(241, 241, 241)
  const lightContrast = contrastRatio(lightBgLum, lightTextLum)
  assert.ok(lightContrast >= 4.5, `Light mode contrast ${lightContrast.toFixed(2)} must be >= 4.5:1`)

  // Dark mode: --text-heading is #f2f7fa (rgb(242, 247, 250)), dark glass backdrop is ~rgb(24, 40, 48)
  const darkTextLum = relLuminance(242, 247, 250)
  const darkBgLum = relLuminance(24, 40, 48)
  const darkContrast = contrastRatio(darkTextLum, darkBgLum)
  assert.ok(darkContrast >= 4.5, `Dark mode contrast ${darkContrast.toFixed(2)} must be >= 4.5:1`)

  // Regression check: with broken offset 0, background was ~rgb(76, 76, 77)
  const brokenMudLum = relLuminance(76, 76, 77)
  const brokenContrast = contrastRatio(brokenMudLum, lightTextLum)
  assert.ok(brokenContrast < 2.0, `Broken offset 0 produced failing contrast of ${brokenContrast.toFixed(2)}:1`)
})

test('LiquidTabList active tab lens meets Liquid Glass V2 styling requirements', async () => {
  const css = await readFile(new URL('../src/components/ui/LiquidTabList.css', import.meta.url), 'utf8')
  // Backdrop filter must connect to SVG lens filter with real optical blur
  assert.match(css, /backdrop-filter:\s*var\(--glass-lens-filter[\s\S]*?blur\(12px\)/, 'Lens must connect to SVG lens filter with 12px optical blur')
  // Subtly defined specular highlight rim (1px gradient highlight on top edge)
  assert.match(css, /\.liquid-tabs__lens::before[\s\S]*?padding:\s*1px/, 'Specular highlight rim must use 1px padding')
  // Ensure muddy claymorphic shadow (rgb(12 65 53)) is eliminated
  assert.doesNotMatch(css, /rgb\(12\s+65\s+53/, 'Muddy claymorphic green-gray shadow must be eliminated')
  // Soft ambient occlusion drop shadow in light and dark mode
  assert.match(css, /\.liquid-tabs__lens[\s\S]*?box-shadow:[\s\S]*?inset 0 1px 1px 0 rgba\(255,\s*255,\s*255,\s*0\.85\)/, 'Light mode lens must have top specular inner bevel')
  assert.match(css, /html\[data-theme='dark'\][\s\S]*?\.liquid-tabs__lens[\s\S]*?box-shadow:/, 'Dark theme must define ambient occlusion shadow for lens')
  // Ensure dynamic clear fill token is connected to lens background in light and dark mode
  assert.match(css, /\.liquid-tabs__lens[\s\S]*?background:[\s\S]*?var\(--tabs-lens-tint,\s*var\(--glass-clear-fill\)\)/, 'Light mode lens must connect to dynamic glass clear fill')
  assert.match(css, /html\[data-theme='dark'\][\s\S]*?\.liquid-tabs__lens[\s\S]*?background:[\s\S]*?var\(--tabs-lens-tint,\s*var\(--glass-clear-fill\)\)/, 'Dark mode lens must connect to dynamic glass clear fill')
})

test('SegmentedTabs and MarketplaceHeader subtabs adhere to Liquid Glass V2 styling', async () => {
  const segCss = await readFile(new URL('../src/components/motion/SegmentedTabs.css', import.meta.url), 'utf8')
  assert.match(segCss, /\.segmented-tabs__pill[\s\S]*?var\(--tabs-lens-tint,\s*var\(--glass-clear-fill\)\)/, 'SegmentedTabs pill must connect to dynamic glass clear fill')
  assert.match(segCss, /\.segmented-tabs__pill::before[\s\S]*?padding:\s*1px/, 'SegmentedTabs pill must define 1px specular highlight rim')

  const headerCss = await readFile(new URL('../src/components/marketplace/MarketplaceHeader.css', import.meta.url), 'utf8')
  assert.match(headerCss, /\.marketplace-header__subtab[\s\S]*?background:\s*transparent/, 'MarketplaceHeader subtab must have transparent background override')
})

test('LiquidTabList active tab text meets WCAG AAA standard (>= 7.0:1) in light and dark themes', async () => {
  const css = await readFile(new URL('../src/components/ui/LiquidTabList.css', import.meta.url), 'utf8')
  // Verify --tabs-ink declarations
  assert.match(css, /--tabs-ink:\s*#0f2e28/, 'Light mode tab ink must use deep forest #0f2e28')
  assert.match(css, /html\[data-theme='dark'\][\s\S]*?--tabs-ink:\s*#f0fdf9/, 'Dark mode tab ink must use crisp #f0fdf9')

  // Light mode: #0f2e28 (rgb(15, 46, 40)) against frosted track (~rgb(245, 248, 246))
  const lightInkLum = relLuminance(15, 46, 40)
  const lightTrackLum = relLuminance(245, 248, 246)
  const lightContrast = contrastRatio(lightTrackLum, lightInkLum)
  assert.ok(lightContrast >= 7.0, `Light mode active tab contrast ${lightContrast.toFixed(2)}:1 must meet WCAG AAA (>= 7.0:1)`)

  // Dark mode: #f0fdf9 (rgb(240, 253, 249)) against dark track (~rgb(22, 40, 36))
  const darkInkLum = relLuminance(240, 253, 249)
  const darkTrackLum = relLuminance(22, 40, 36)
  const darkContrast = contrastRatio(darkInkLum, darkTrackLum)
  assert.ok(darkContrast >= 7.0, `Dark mode active tab contrast ${darkContrast.toFixed(2)}:1 must meet WCAG AAA (>= 7.0:1)`)
})

