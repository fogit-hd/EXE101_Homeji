import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const { chromium } = createRequire(import.meta.url)(process.env.HOMEJI_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HOMEJI_TEST_BASE_URL || 'http://127.0.0.1:5518';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
    throw Error('Local fixture only');
const out = 'output/verification/map-food-ink';
await mkdir(out, { recursive: true });
async function jsx(file, predicate) { const text = await readFile(file, 'utf8'), sf = ts.createSourceFile(file, text, 99, true, 4); let result; function visit(n) { if (ts.isJsxElement(n) && predicate(n.openingElement.getText(sf)))
    result = n.getText(sf); ts.forEachChild(n, visit); } visit(sf); assert.ok(result); return result; }
const controls = await jsx('src/components/map/RentalMap.tsx', s => s.includes('className="rental-map__controls"'));
const food = await jsx('src/components/marketplace/food/FoodMarketplaceView.tsx', s => s.includes('aria-label="Gợi ý hôm nay"'));
await writeFile(out + '/index.html', '<!doctype html><html lang="vi"><meta charset="utf-8"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>');
await writeFile(out + '/scene.tsx', `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{LiquidGlassEffects}from'/src/components/ui/LiquidGlassEffects.tsx';import{SearchInterestCenter}from'/src/components/ai/SearchInterestCenter.tsx';import{FOOD_ASSETS}from'/src/components/marketplace/food/foodAssets.ts';import'/src/index.css';import'/src/liquid-glass.css';import'/src/components/theme/dark-theme.css';import'/src/product-ui.css';import'/src/glass-controls.css';import'/src/content-surfaces.css';import'/src/workspace-readability.css';import'/src/home-refinement.css';import'/src/components/map/RentalMap.css';import'/src/components/map/explore/MapExploreDestination.css';import'/src/components/marketplace/food/FoodMarketplaceView.css';const featured={title:'Bún trộn thịt nướng',description:'Bún trộn rau tươi',mediaUrls:[]},featuredDistance='Món đang mở bán',featuredPortions=5,featuredEta='20 phút',featuredPrice='35.000 đ',displayMode='roadmap',locating=false;const selectBaseMap=()=>{},onLocate=()=>{},zoomBy=()=>{document.body.dataset.zoom='yes'},onShowOnMap=()=>{document.body.dataset.food='yes'};createRoot(document.getElementById('root')).render(<MemoryRouter><LiquidGlassEffects/><main style={{padding:24}}><div className="marketplace-page--food">${food}</div><div className="map-explore"><div className="rental-map" style={{height:200}}>${controls}</div></div><SearchInterestCenter/></main></MemoryRouter>);`);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1000, height: 750 } });
await page.addInitScript(() => localStorage.setItem('homeji_access_token', 'fixture'));
let settings = { enabled: true, aiEnabled: true, emailEnabled: false };
page.on('pageerror', e => console.error(e.message));
page.on('console', m => { if (m.type() === 'error')
    console.error(m.text()); });
await page.route('**/src/contexts/AuthContext.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1}})' }));
await page.route('**/api/**', r => { if (!new URL(r.request().url()).pathname.startsWith('/api/'))
    return r.continue(); if (r.request().method() === 'PUT')
    settings = r.request().postDataJSON(); return r.fulfill({ json: { settings, following: [], suggestions: [], rooms: [] } }); });
const results = [];
try {
    for (const theme of ['light', 'dark']) {
        await page.goto(base + '/' + out + '/index.html');
        await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
        await page.waitForTimeout(800);
        const values = await page.evaluate(() => { const lum = c => { const v = c.map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return v[0] * .2126 + v[1] * .7152 + v[2] * .0722; }; const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number), ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05); const bg = el => { for (let e = el; e; e = e.parentElement) {
            const c = getComputedStyle(e).backgroundColor, n = c.match(/[\d.]+/g)?.map(Number);
            if (n && n.length >= 3 && (n.length === 3 || n[3] >= .95))
                return n.slice(0, 3);
        } return [255, 255, 255]; }; const text = s => { const e = document.querySelector(s); return { ink: getComputedStyle(e).color, background: bg(e), contrast: ratio(rgb(getComputedStyle(e).color), bg(e)) }; }; return { food: text('.food-featured__cta'), interest: text('.interest-launch'), icons: [...document.querySelectorAll('.rental-map__btn img')].map(img => { const c = document.createElement('canvas'); c.width = 40; c.height = 40; const ctx = c.getContext('2d'); ctx.filter = getComputedStyle(img).filter; ctx.drawImage(img, 0, 0, 40, 40); const data = ctx.getImageData(0, 0, 40, 40).data; let pixel; for (let i = 0; i < data.length; i += 4)
                if (data[i + 3] > 240) {
                    pixel = [...data.slice(i, i + 3)];
                    break;
                } return { src: img.getAttribute('src'), filter: getComputedStyle(img).filter, contrast: pixel ? ratio(pixel, bg(img.parentElement)) : 0 }; }) }; });
        results.push({ theme, ...values });
        await page.screenshot({ path: out + '/' + theme + '.png' });
    }
    await writeFile(out + '/results.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
    assert.ok(results.every(r => r.food.contrast >= 4.5 && r.interest.contrast >= 4.5 && r.icons.every(i => i.contrast >= 3)), 'Labels and map icons must remain readable in both themes');
    await page.getByRole('button', { name: 'Phóng to', exact: true }).click();
    assert.equal(await page.locator('body').getAttribute('data-zoom'), 'yes');
    await page.getByRole('button', { name: 'Xem vị trí nhận món', exact: true }).click();
    assert.equal(await page.locator('body').getAttribute('data-food'), 'yes');
    await page.getByRole('button', { name: 'Phòng mới', exact: true }).click();
    const tracking = page.getByRole('checkbox', { name: 'Tự gợi ý từ những lần tìm phòng', exact: true }), ai = page.getByRole('checkbox', { name: 'Tự xếp hạng phòng mới bằng AI', exact: true });
    await tracking.waitFor();
    assert.equal(await tracking.isChecked(), true);
    assert.equal(await ai.isChecked(), true);
    assert.equal(await page.getByRole('checkbox', { name: 'Nhận email tổng hợp phòng mới, tối đa một lần/ngày', exact: true }).isChecked(), false);
    await tracking.click();
    await page.waitForFunction(() => !document.querySelector('.interest-content input[type=checkbox]')?.checked);
    await page.reload();
    await page.getByRole('button', { name: 'Phòng mới', exact: true }).click();
    await tracking.waitFor();
    assert.equal(await tracking.isChecked(), false);
    console.log('PASS readable food CTA and map icons; automatic settings, email opt-in and persistent opt-out');
}
finally {
    await browser.close();
}
