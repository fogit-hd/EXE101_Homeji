import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/localPlaceSearch.ts', import.meta.url), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { isCoverageOnlySearch, relevantRecentLocations, isConcretePlacePrediction } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)

test('coverage history does not compete with concrete streets or school campuses', () => {
  for (const item of ['Quận 9', 'q 9', 'TP Thủ Đức', 'Trường Thọ Thủ Đức', 'thu duc']) assert.equal(isCoverageOnlySearch(item), true, item)
  for (const item of ['Đường Trường Thọ', 'Đại học Thủ Đức', 'Đường số 9', 'Trường THPT Trường Thọ', 'Lê Văn Việt']) assert.equal(isCoverageOnlySearch(item), false, item)
  assert.deepEqual(relevantRecentLocations(['Quận 9', 'Lê Văn Việt', 'Đại học FPT', 'Trường Thọ Thủ Đức'], ''), ['Lê Văn Việt', 'Đại học FPT'])
})

test('recent destinations follow the current query with accent-insensitive matching', () => {
  assert.deepEqual(relevantRecentLocations(['Lê Văn Việt', 'Đại học FPT', 'Võ Văn Ngân'], 'le van'), ['Lê Văn Việt'])
  assert.deepEqual(relevantRecentLocations(['Đại học FPT', 'Lê Văn Việt'], 'DAI HOC'), ['Đại học FPT'])
  assert.deepEqual(relevantRecentLocations(['Đại học FPT'], 'không có'), [])
})

test('Google prediction types exclude broad administrative areas but keep streets and schools', () => {
  assert.equal(isConcretePlacePrediction('Linh Trung', ['administrative_area_level_3', 'political']), false)
  assert.equal(isConcretePlacePrediction('Dĩ An', ['locality', 'political']), false)
  assert.equal(isConcretePlacePrediction('Quận 9'), false)
  assert.equal(isConcretePlacePrediction('Đường Trường Thọ', ['route', 'geocode']), true)
  assert.equal(isConcretePlacePrediction('Đại học FPT', ['university', 'point_of_interest']), true)
})
