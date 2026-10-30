import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function load(imports){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/placeAutocomplete.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>imports[n],Map,Number,Math,Error});return exports}
const unavailable=()=>Promise.resolve({AutocompleteSuggestion:{fetchAutocompleteSuggestions:async()=>{throw Error('REQUEST_DENIED')}}})
const places=load({'./googleMaps':{DEFAULT_MAP_CENTER:{lat:10,lng:106}},'./loadGoogleMaps':{importPlacesLibrary:unavailable},'./localPlaceSearch':{},'./homejiServiceArea':{}})
test('address forms can distinguish provider failures from no matching addresses',async()=>{await assert.rejects(places.fetchPlacePredictions('123 Lê Lợi',{throwOnError:true}));assert.deepEqual(Array.from(await places.fetchPlacePredictions('123 Lê Lợi')),[])})

test('address autocomplete uses the JavaScript Maps circle shape',async()=>{
 let captured
 const api=load({'./googleMaps':{DEFAULT_MAP_CENTER:{lat:10.87,lng:106.8}},'./loadGoogleMaps':{importPlacesLibrary:async()=>({AutocompleteSuggestion:{fetchAutocompleteSuggestions:async request=>{captured=request;return {suggestions:[]}}}})},'./localPlaceSearch':{},'./homejiServiceArea':{}})
 await api.fetchPlacePredictions('12 đường số 8',{throwOnError:true})
 assert.equal(captured.locationBias.center.lat,10.87)
 assert.equal(captured.locationBias.radius,25000)
 assert.equal('circle' in captured.locationBias,false)
})
