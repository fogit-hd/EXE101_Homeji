import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
const base=process.env.HOMEJI_POST_TEST_URL||'http://127.0.0.1:5201'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixtures only')
const out = new URL('../output/verification/post-form-recovery/', import.meta.url)
await mkdir(out, {recursive: true})
await writeFile(new URL('fixture.tsx', out), await readFile(new URL('./fixtures/post-form-recovery.tsx', import.meta.url)))
await writeFile(new URL('fixture.html', out), '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="./fixture.tsx"></script></body></html>')
const browser=await chromium.launch({channel:'msedge',headless:true})
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'})
const errors=[];const writes=[];let failSave=true, role=1
let post={id:'qa',ownerId:'user',ownerRole:1,type:3,status:1,title:'Phòng kiểm thử',description:'Mô tả phòng kiểm thử',price:2500000,deposit:1000000,area:25,address:'12 đường số 8, Linh Trung, Thủ Đức',latitude:10.85,longitude:106.78,amenities:[],media:[],maxOccupants:2,availableSlots:1,availableFrom:'2026-11-01',originalLeaseEndsOn:'2027-11-01',transferKind:1,passFee:0,transferReason:'Chuyển nơi làm việc',ownerConsentConfirmed:true,ownerConsentContact:'fixture@example.test'}
await page.addInitScript(() => {
  localStorage.setItem('homeji_access_token', 'fixture-only')
  window.qaLookup = 'error'
  window.qaGeocode = 'success'
  class Place {
    constructor() {
      this.location = {lat: () => 10.85, lng: () => 106.78}
      this.formattedAddress = '12 đường số 8, Linh Trung, Thủ Đức'
    }
    async fetchFields() { if (window.qaLookup === 'resolve-error') throw Error('REQUEST_DENIED') }
  }
  class Geocoder {
    async geocode() {
      if (window.qaGeocode === 'error') throw Error('REQUEST_DENIED')
      return {results: [{geometry: {location: {lat: () => 10.85, lng: () => 106.78}}, formatted_address: 'Địa chỉ kiểm thử'}]}
    }
  }
  const AutocompleteSuggestion = {
    async fetchAutocompleteSuggestions() {
      await new Promise(r => setTimeout(r, 40))
      if (window.qaLookup === 'error') throw Error('REQUEST_DENIED')
      if (window.qaLookup === 'empty') return {suggestions: []}
      return {suggestions: [{placePrediction: {placeId: 'qa-place', mainText: '12 đường số 8', secondaryText: 'Linh Trung, Thủ Đức'}}]}
    }
  }
  window.google = {maps: {importLibrary: async name => name === 'places' ? {AutocompleteSuggestion, Place} : {Geocoder}}}
})
page.on('pageerror',e=>errors.push(e.message))
await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(base).origin)return route.abort();if(!u.pathname.startsWith('/api/'))return route.continue();if(u.pathname==='/api/profile/me')return route.fulfill({json:{id:'user',displayName:'Người kiểm thử',role,onboardingCompleted:true}});if(u.pathname==='/api/rental-posts/qa/archive'){writes.push('archive');return route.fulfill({status:204})}if(u.pathname==='/api/rental-posts/qa'){if(route.request().method()==='PUT'){const body=route.request().postDataJSON();writes.push(body);if(failSave)return route.fulfill({status:503,json:{detail:'Fixture service unavailable'}});post={...post,...body}}return route.fulfill({json:post})}return route.fulfill({json:[]})})
try{
await page.goto(base+'/output/verification/post-form-recovery/fixture.html')
const address=page.getByRole('combobox',{name:'Địa chỉ',exact:true});await address.waitFor();await address.fill('123 Lê Lợi');await page.getByText('Chưa tải được gợi ý địa chỉ.',{exact:false}).waitFor();assert.equal(await address.isEnabled(),true)
await page.evaluate(()=>window.qaLookup='empty');await address.fill('Không có địa chỉ');await page.getByText('Chưa tìm thấy địa chỉ.',{exact:false}).waitFor()
await page.evaluate(()=>window.qaLookup='resolve-error');await address.fill('12 đường số 8');await page.getByRole('option',{name:/12 đường số 8/}).click();await page.getByText('Chưa lấy được vị trí.',{exact:false}).waitFor()
await page.getByRole('button',{name:'Wifi',exact:false}).click();await page.getByRole('button',{name:'Wifi',exact:false}).getAttribute('aria-pressed').then(x=>assert.equal(x,'true'))
await page.getByRole('combobox',{name:'Hình thức',exact:true}).click();const dialog=page.locator('.choice-picker-layer[open]');await dialog.getByRole('option',{name:'Cho thuê lại tạm thời — sẽ quay lại',exact:true}).click();assert.equal(await page.locator('select#transfer-kind-native').inputValue(),'2')
await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByText('Hệ thống đang gặp sự cố.',{exact:false}).waitFor();assert.equal(await address.inputValue(),'12 đường số 8');assert.equal(await page.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Phòng kiểm thử')
failSave=false;await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByText('Đã lưu tin đăng.',{exact:true}).waitFor();const saved=writes.filter(x=>typeof x==='object').at(-1);assert.equal(saved.transferKind,2);assert.equal(saved.latitude,10.85);assert.equal(saved.longitude,106.78);assert.ok(saved.amenities.includes('WIFI'))
await page.evaluate(()=>{document.documentElement.dataset.theme='dark';window.qaGeocode='error'});await address.fill('Địa chỉ mới');await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByText('Chưa kết nối được dịch vụ tìm vị trí.',{exact:false}).waitFor();assert.equal(await address.isEnabled(),true)
for(const width of [1280,390]){await page.setViewportSize({width,height:900});await page.getByRole('combobox',{name:'Hình thức',exact:true}).click();await dialog.getByRole('listbox').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const box=await dialog.locator('section').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=901);await page.screenshot({path:'output/verification/post-form-recovery/select-'+width+'.png'});await page.keyboard.press('Escape')}
await page.getByRole('button',{name:'Wifi',exact:false}).scrollIntoViewIfNeeded();await page.screenshot({path:'output/verification/post-form-recovery/amenities-mobile.png'})
page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Lưu trữ',exact:true}).last().click();await page.getByTestId('destination').waitFor();assert.match(await page.getByTestId('destination').textContent(),/section=myPosts/);assert.equal(writes.at(-1),'archive');assert.deepEqual(errors,[])
await page.goto(base+'/output/verification/post-form-recovery/fixture.html?create=1')
await page.getByRole('button',{name:/Nhượng phòng/}).waitFor()
assert.equal(await page.getByRole('button',{name:/Nhượng phòng/}).getAttribute('aria-pressed'),'true')
assert.equal(await page.getByRole('button',{name:/Nhượng phòng/}).isEnabled(),true)
role=2
await page.reload()
await page.getByRole('button',{name:/Nhượng phòng/}).waitFor()
assert.equal(await page.getByRole('button',{name:/Nhượng phòng/}).isDisabled(),true)
assert.equal(await page.getByRole('button',{name:/^Phòng trống/}).isEnabled(),true)
const result={providerErrorsDistinct:true,manualEntryEnabled:true,selectionFailureExplained:true,saveFailurePreservesInput:true,geocodeBeforeSave:true,selectedTermsAndAmenitiesPersisted:true,archiveReturnsToMyPosts:true,widths:[1280,390],errors,evidence:'Local mocked APIs only'};await writeFile('output/verification/post-form-recovery/results.json',JSON.stringify(result,null,2));console.log(result)
}catch(e){console.log(JSON.stringify({url:page.url(),errors,text:(await page.locator('body').innerText()).slice(0,1800)}));throw e}finally{await browser.close()}
