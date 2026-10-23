import assert from 'node:assert/strict'
import test from 'node:test'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const { isFoodChat, isFoodDiscoveryChat, isFoodRefinement, foodCriteriaSnapshot } = await import(reactDomModule('src/lib/foodChatIntent.ts'))
for (const [message, topic, discovery] of [
  ['CÓ GÌ ĂN GIỚI THIỆU ĐI', true, true],
  ['GIỚI THIỆU ĐỒ ĂN NGON GẦN TUI', true, true],
  ['Đồ ăn gần phòng này dưới 40k', true, true],
  ['Có cơm gà không?', true, true],
  ['Mình đói bụng', true, true],
  ['Gợi ý phòng có bếp nấu ăn', false, false],
  ['Tìm phòng gần quán ăn', false, false],
  ['Phòng này có tiện nấu cơm không?', false, false],
  ['Cách đặt đồ ăn gần đây?', true, false],
  ['Tôi muốn thanh toán đơn hàng đồ ăn', true, false],
]) test(`food routing: ${message}`, () => {
  assert.equal(isFoodChat(message), topic)
  assert.equal(isFoodDiscoveryChat(message), discovery)
})

test('short refinements stay bounded and snapshots retain only public search criteria', () => {
  for (const text of ['gần tui', 'dưới 40k', '40k', 'bỏ ngân sách', 'bỏ vị trí', 'bỏ từ khóa']) assert.equal(isFoodRefinement(text), true)
  for (const text of ['giá phòng này', 'Tìm phòng dưới 3tr', 'cách thanh toán', 'nhà thuốc gần tôi']) assert.equal(isFoodRefinement(text), false)
  assert.deepEqual(foodCriteriaSnapshot({ keyword: 'cơm gà', maxPrice: 40000, origin: null, status: 'locationRequired', privateNotes: 'Do not send' }),
    { keyword: 'cơm gà', maxPrice: 40000, origin: null, nearby: true })
})
