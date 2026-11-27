import assert from 'node:assert/strict'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { chromium } from 'playwright'

const out = 'output/verification/listing-amenities'
await mkdir(out, { recursive: true })
const values = ['WIFI', 'AIR_CONDITIONER', 'BED', 'FRIDGE', 'WASHING_MACHINE', 'KITCHEN', 'BALCONY', 'PARKING', 'ELEVATOR', 'SECURITY', 'CEILING_FAN', 'LOFT', 'PRIVATE_BATHROOM', 'WINDOW', 'WATER_HEATER', 'PET_FRIENDLY', ...Array.from({ length: 14 }, (_, i) => `Tiện ích bổ sung ${i + 1}`)]
const css = ['index.css', 'components/theme/theme.css', 'components/layout/AppLayout.css', 'pages/HomePage.css', 'ui-consistency.css', 'liquid-glass.css', 'components/theme/dark-theme.css', 'product-ui.css', 'glass-controls.css', 'content-surfaces.css', 'workspace-readability.css', 'home-refinement.css']
const imports = []
for (const path of css) { try { await access('src/' + path); imports.push(`import '/src/${path}';`) } catch {} }
await writeFile(out + '/index.html', '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./scene.tsx"></script></html>')
const posts = [2, 30].map((count, i) => ({ id: `room-${i}`, title: `Phòng kiểm thử ${i}`, address: 'Linh Trung, Thủ Đức', price: 3000000, area: 25, deposit: 3000000, maxOccupants: 2, isOwnerPremium: i===1, highlightTag: i===0?'Nổi bật':null, ownerId: 'owner', ownerDisplayName: 'Chủ phòng', type: 1, amenities: values.slice(0, count), thumbnailPath: '/brand/homeji-logo2.png', media: [] }))
await writeFile(out + '/scene.tsx', `import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom'; import {ListingAmenities} from '/src/components/map/listings/ListingAmenities.tsx'; import {MapListingsWorkspace} from '/src/components/map/listings/MapListingsWorkspace.tsx'; ${imports.join('')} const values=${JSON.stringify(values)}; const workspace=new URLSearchParams(location.search).has('workspace'); createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/?section=listings&view='+(new URLSearchParams(location.search).get('view')||'split')]}>
{workspace ? <div className="app-shell app-shell--product app-shell--listings app-shell--map-peer"><header style={{height:76,flexShrink:0}}>Homeji · dữ liệu kiểm thử</header><main className="app-main"><div className="route-outlet route-outlet--map-peer"><div className="home-map-page home-map-page--dest is-map-destination is-explore-map"><MapListingsWorkspace posts={${JSON.stringify(posts)}} selectedListingId={new URLSearchParams(location.search).has('selected')?'room-0':null} hoveredListingId={null} loading={false} error="" mapNode={<div style={{height:'100%'}}>Bản đồ kiểm thử</div>} onHoverListing={()=>{}} onLeaveListing={()=>{}} onSelectListing={id=>{window.selectedRoom=id}} onSelectSource={pin=>{window.selectedSource={id:pin.id,lat:pin.lat,lng:pin.lng}}} onOpenRoomDetail={id=>{window.openedRoom=id}} savedIds={new Set(['room-0'])} onToggleSave={id=>{window.savedRoom=id}} onResetFilters={()=>{}} /></div></div></main></div> : <main style={{padding:20,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:20}}>{[0,2,30].map(n=><article key={n} data-count={n} style={{padding:16,border:'1px solid var(--border)',minWidth:0}}><h2>Phòng {n} tiện ích</h2><ListingAmenities values={n===30?[...values,'WIFI',' ']:values.slice(0,n)} selected={new URLSearchParams(location.search).has('unfiltered')?[]:new URLSearchParams(location.search).has('manyfilters')?['WIFI','BED','FRIDGE']:['WIFI']} area="25 m²" propertyType="Phòng trọ" title={'Phòng '+n+' tiện ích'}/><button>Chi tiết phòng</button></article>)}</main>}
</MemoryRouter>);`)
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
try {
  for (const theme of ['light', 'dark']) for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`http://localhost:5194/${out}/index.html`)
    await page.evaluate(t => document.documentElement.dataset.theme=t, theme)
    const blocks = page.locator('.listing-amenities')
    await blocks.nth(2).waitFor()
    const heights = await blocks.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height))
    assert.ok(heights.every(h=>Math.abs(h-heights[0])<1), '0, 2 and 30 amenities reserve the same height')
    assert.equal(await page.locator('[data-count="30"] .listing-amenities__preview li').first().innerText(), 'Wifi')
    assert.ok(await page.locator('[data-count="30"] .listing-amenities__preview li').first().evaluate(e=>e.classList.contains('is-matched')),'Selected non-primary amenity is promoted and highlighted')
    assert.equal(await page.locator('[data-count="30"] .listing-amenities__facts').innerText(),'25 m²\nPhòng trọ')
    const trigger = page.locator('[data-count="30"] .listing-amenities__more')
    assert.match(await trigger.innerText(), /Có 30 tiện ích/)
    const card = page.locator('[data-count="30"]')
    const before = (await card.boundingBox()).height
    await trigger.click()
    const panel = width<768 ? page.locator('dialog[open]') : page.locator('[popover]:popover-open')
    await panel.waitFor()
    assert.equal(await panel.locator('.listing-amenities__all li').count(), 30)
    const rect = await panel.boundingBox()
    assert.ok(rect.x>=-1 && rect.x+rect.width<=width+1 && rect.y>=-1 && rect.y+rect.height<=901, 'Overlay stays inside viewport')
    assert.equal((await card.boundingBox()).height, before, 'Opening amenities does not resize card')
    await panel.locator('.listing-amenities__all li').last().scrollIntoViewIfNeeded()
    assert.ok(await panel.locator('.listing-amenities__all li').last().isVisible())
    await page.screenshot({path:`${out}/${width}-${theme}-open.png`})
    await page.keyboard.press('Escape')
    await panel.waitFor({state:'hidden'})
    assert.ok(await trigger.evaluate(e=>e===document.activeElement), 'Escape returns focus to trigger')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'No horizontal page overflow')
    assert.deepEqual(errors, [])
    await page.close()
  }
  const plain=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'})
  await plain.goto(`http://localhost:5194/${out}/index.html?unfiltered=1`)
  const main=plain.locator('[data-count="30"] .listing-amenities__preview li')
  await main.first().waitFor()
  assert.equal(await main.count(),2,'Default card only shows two primary amenities')
  assert.ok(!(await main.allInnerTexts()).includes('Wifi'),'Secondary amenities stay in full list unless filtered')
  await plain.goto(`http://localhost:5194/${out}/index.html?manyfilters=1`)
  const filtered=plain.locator('[data-count="30"] .listing-amenities__preview li')
  await filtered.nth(2).waitFor()
  assert.deepEqual(await filtered.allInnerTexts(),['Wifi','Giường','Tủ lạnh'],'Non-primary filtered amenities replace default main amenities')
  assert.equal(await plain.locator('[data-count="30"] .listing-amenities__preview li.is-matched').count(),3)
  await plain.close()
  const p = await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'})
  await p.route('**/src/contexts/AuthContext.tsx*', r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({isAuthenticated:true,profile:{id:"fixture",role:1}})'}))
  await p.route('**/src/contexts/AuthModalContext.logic.tsx*', r=>r.fulfill({contentType:'application/javascript',body:'export const useAuthModal=()=>({openAuthModal:()=>{}})'}))
  const source = {id:'06b4d502-a036-5d3b-936b-666ec701c540',title:'Phòng kiểm thử nguồn',address:'Thủ Đức',district:'',price:3000000,area:25,imageUrls:[],source:'mogi',latitude:10.85,longitude:106.76,sourceId:'fixture',sourceUrl:'https://mogi.vn',sourceUpdatedAt:null,collectedAt:'2026-11-27',amenityHighlights:values}
  await p.route('**/src/api/rentalSources.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const getRentalSourceCatalog=async()=>${JSON.stringify([source])};export const rentalSourcePublisher=()=>"Nguồn kiểm thử";export const rentalSourceImageHref=()=>null;export const sourceRoomHref=id=>"/rental/"+id;`}))
  await p.route('**/src/contexts/rental-journey.ts*',r=>r.fulfill({contentType:'application/javascript',body:'export const useRentalJourney=()=>({enabled:true,choices:[],maxChoices:5,toggle:choice=>{window.consideredRoom=choice.postId}})'}))
  await p.goto(`http://localhost:5194/${out}/index.html?workspace=1`)
  await p.locator('.source-results__card .listing-amenities__more').waitFor()
  assert.equal(await p.locator('button button').count(),0,'No nested buttons in native cards')
  assert.equal(await p.locator('.rental-result-card:not(.source-results__card) .listing-amenities').count(),2,'Native cards use shared amenities')
  assert.equal(await p.locator('.source-results__card .listing-amenities').count(),1,'Imported cards use shared amenities')
  const cards=p.locator('.rental-result-card');
  assert.equal(await cards.count(),3);
  for (const card of await cards.all()) {
    assert.equal(await card.locator('.map-listings__save').count(),1,'Every card has a save action')
    assert.ok(await card.getByRole('button',{name:/cân nhắc/}).isEnabled(),'Every linked card can be considered')
    assert.equal(await card.getByRole('button',{name:'Bản đồ',exact:true}).count(),0,'No separate map button')
    await card.locator('.rental-result-card__price-row').click()
    const mapId=await card.getAttribute('data-listing-id')
    assert.equal(await p.evaluate(id=>id.startsWith('rental:')?window.selectedSource?.id:window.selectedRoom,mapId),mapId,'Map action selects the matching native/source location')
    await p.evaluate(()=>{window.selectedSource=null;window.selectedRoom=null})
    await card.locator('.map-listings__save').click()
    const id=await card.getAttribute('data-listing-id')
    assert.equal(await p.evaluate(()=>window.savedRoom),id.replace(/^rental:/,''),'Save uses the actual native post ID')
    await card.getByRole('button',{name:/cân nhắc/}).click()
    assert.equal(await p.evaluate(()=>window.consideredRoom),id.replace(/^rental:/,''),'Consider uses the actual native post ID')
    assert.ok(await p.evaluate(()=>!window.selectedSource&&!window.selectedRoom),'Save and consideration do not trigger map selection')
  }

  assert.equal(await p.locator('.rental-result-card__price-row .rental-result-card__area').count(),0,'Area no longer appears beside price')
  assert.equal(await p.locator('.rental-result-card__type').count(),0,'Property type is not repeated on the image')
  assert.equal(await p.locator('.rental-result-card .listing-amenities__facts').count(),3,'Both inventories show area and property type with amenities')

  assert.equal(await p.locator('.rental-result-card.is-featured').count(),1,'Only server Premium is featured, never a spoofed tag')
  const featured=p.locator('.rental-result-card.is-featured')
  await featured.scrollIntoViewIfNeeded()
  await p.waitForFunction(()=>document.querySelector('.rental-result-card.is-featured')?.classList.contains('is-featured-revealed'))
  const featuredSize=await featured.boundingBox()
  assert.equal(await featured.locator('.premium-badge__text').innerText(),'Nổi bật')
  assert.equal(await featured.locator('.rental-result-card__cover').evaluate(e=>getComputedStyle(e,'::after').animationName),'none','Reduced motion disables sweep')
  await p.emulateMedia({reducedMotion:'no-preference'})
  const motion=await featured.locator('.rental-result-card__cover').evaluate(e=>{const c=getComputedStyle(e,'::after');return {name:c.animationName,count:c.animationIterationCount,pointer:c.pointerEvents}})
  assert.deepEqual(motion,{name:'rental-featured-sweep',count:'1',pointer:'none'})
  const animatedSize=await featured.boundingBox()
  assert.equal(animatedSize.width,featuredSize.width)
  assert.equal(animatedSize.height,featuredSize.height)
  await p.emulateMedia({reducedMotion:'reduce'})
  await p.locator('.source-results__card').scrollIntoViewIfNeeded()

  const first=await cards.nth(0).boundingBox(),second=await cards.nth(1).boundingBox();
  assert.ok(Math.abs(first.height-second.height)<1,'Native and imported cards share height');
  const footers=await p.locator('.rental-result-card__actions').evaluateAll(es=>es.slice(0,2).map(e=>e.getBoundingClientRect().bottom));
  assert.ok(Math.abs(footers[0]-footers[1])<1,'Footers align');
  await p.locator('.source-results__card .rental-result-card__media').click()
  assert.deepEqual(await p.evaluate(()=>window.selectedSource),{id:'rental:06b4d502-a036-5d3b-936b-666ec701c540',lat:10.85,lng:106.76},'Source card selects its map location')
  await p.locator('.source-results__card .listing-amenities__more').click()
  assert.equal(await p.locator('[popover]:popover-open .listing-amenities__all li').count(),30)
  await p.keyboard.press('Escape')
  await p.screenshot({path:out+'/workspace.png'})
  await p.goto(`http://localhost:5194/${out}/index.html?workspace=1&selected=1`)
  const viewing=p.getByRole('article',{name:'Phòng đang xem'})
  await viewing.waitFor()
  assert.match(await viewing.innerText(),/Đang xem/)
  assert.ok((await viewing.boundingBox()).height<=150,'Viewing strip stays compact')
  assert.equal(await viewing.locator('.premium-badge,.listing-amenities,.rental-journey-toggle').count(),0,'No duplicated card details or consideration action')
  await viewing.getByRole('button',{name:'Chi tiết',exact:true}).click()
  assert.equal(await p.evaluate(()=>window.openedRoom),'room-0')
  await p.screenshot({path:out+'/viewing-strip.png'})
  for(const theme of ['light','dark']) for(const width of [1440,768,390,320]) {
    await p.setViewportSize({width,height:1000})
    await p.goto(`http://localhost:5194/${out}/index.html?workspace=1&view=list`)
    await p.evaluate(t=>document.documentElement.dataset.theme=t,theme)
    await p.locator('.source-results__card .listing-amenities__more').waitFor()
    const native=p.locator('.rental-result-card:not(.source-results__card)').first()
    assert.ok(await native.getByRole('button',{name:/Thêm vào cân nhắc/}).isVisible(),'Keep consideration action')
    assert.ok(await native.getByRole('button',{name:'Xem phòng',exact:true}).isVisible(),'Keep room detail action')
    assert.ok(await native.locator('.rental-result-card__media').isVisible(),'Card image is the keyboard-accessible map action')
    for(const card of await p.locator('.rental-result-card').all()) {
      assert.ok(await card.isVisible())
      const boxes=await card.locator('.rental-result-card__body,.rental-result-card__actions').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()))
      assert.ok(boxes[1].top>=boxes[0].bottom-1,'Actions follow content without overlap')
    }
    await p.locator('.source-results__card .rental-result-card__address').click()
    await p.locator('.map-listings--split').waitFor()
    assert.equal(await p.evaluate(()=>window.selectedSource?.id),'rental:06b4d502-a036-5d3b-936b-666ec701c540','Map action opens split view from list mode')
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No card overflow')
    await p.screenshot({path:`${out}/cards-${width}-${theme}.png`,fullPage:true})
  }
  // Regression: an ordinary source card without coordinates must never become a detail link.
  await p.setViewportSize({width:1440,height:1000})
  const missing={...source,latitude:null,longitude:null}
  await p.route('**/src/api/rentalSources.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const getRentalSourceCatalog=async()=>${JSON.stringify([missing])};export const rentalSourcePublisher=()=>"Nguồn kiểm thử";export const rentalSourceImageHref=()=>null;export const sourceRoomHref=id=>"/rental/"+id;`}))
  let mode='success'
  await p.route('**/src/lib/placeAutocomplete.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export async function resolveSearchLocation(address){window.resolvedAddress=address;${mode==='success'?'return {lat:10.85,lng:106.76}':'return null'}};`}))
  await p.goto(`http://localhost:5194/${out}/index.html?workspace=1&view=list`)
  let ordinary=p.locator('.source-results__card')
  await ordinary.locator('.rental-result-card__media').waitFor()
  assert.equal(await ordinary.locator('a:not(.rental-result-card__detail)').count(),0,'No detail fallback on image or title')
  await ordinary.locator('.rental-result-card__media').focus()
  await p.keyboard.press('Enter')
  await p.waitForFunction(()=>window.selectedSource?.lat===10.85)
  assert.equal(await p.evaluate(()=>window.resolvedAddress),source.address)
  assert.match(await ordinary.getByRole('status').innerText(),/Vị trí tìm theo địa chỉ/)
  assert.equal(await p.evaluate(()=>window.openedRoom),undefined,'Coordinate fallback never opens room details')
  mode='failure'
  await p.goto(`http://localhost:5194/${out}/index.html?workspace=1&view=list`)
  ordinary=p.locator('.source-results__card')
  await ordinary.locator('.rental-result-card__title button').click()
  await ordinary.getByRole('status').filter({hasText:'Chưa xác định'}).waitFor()
  assert.equal(await p.evaluate(()=>window.selectedSource),undefined,'Unresolved address does not invent a map pin')
  assert.equal(await p.evaluate(()=>window.openedRoom),undefined,'Unresolved address does not navigate to details')
  assert.equal(await ordinary.locator('.rental-result-card__detail').getAttribute('href'),'/rental/'+source.id,'Explicit detail link remains available')
  await p.close()
  console.log('PASS: fixed 2-row preview for 0/2/30 items, deduplication, filter priority, all 30 accessible, no card growth, desktop popover/mobile sheet, Escape/focus, 320–1440 light/dark, native and imported card integration')
} finally { await browser.close() }
