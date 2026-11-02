import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesListingText } from '../src/lib/searchQuery.ts'

test('listing search accepts Vietnamese accents, casing and reordered address words', () => {
  const values = ['Phòng trọ có máy lạnh', '120 Lê Văn Việt, Thủ Đức', 'Máy nước nóng']
  for (const query of ['le van viet', 'LÊ VĂN VIỆT', 'thu duc 120', 'nuoc nong', '']) assert.equal(matchesListingText(query, values), true, query)
  assert.equal(matchesListingText('le van viet ban cong', values), false)
  assert.equal(matchesListingText('le van viet', [null, undefined]), false)
})
