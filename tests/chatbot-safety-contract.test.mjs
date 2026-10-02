import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const chatbotSource = await readFile(
  new URL('../src/components/map/MapChatbot.tsx', import.meta.url),
  'utf8',
)
const marketplaceSource = await readFile(
  new URL('../src/pages/MarketplacePage.tsx', import.meta.url),
  'utf8',
)

test('chatbot presents the Homeji name and logo', () => {
  assert.match(chatbotSource, /const HOMEJI_TITLE = 'Homeji'/)
  assert.match(chatbotSource, /function HomejiAvatar/)
  assert.match(chatbotSource, /src="\/brand\/homeji-logo\.png"/)
  assert.doesNotMatch(chatbotSource, /\bHomie\b/)
})

test('chatbot food actions open the requested marketplace view', () => {
  assert.match(chatbotSource, /view === 'food' \|\| view === 'cart'/)
  assert.match(chatbotSource, /if \(view === 'cart'\) requestMarketplaceCart\(\)/)
})

test('food order API remains behind an explicit confirmation gate', () => {
  const checkoutFunction = marketplaceSource.indexOf('const checkoutCart = async () =>')
  const confirmationGuard = marketplaceSource.indexOf('if (!checkoutConfirmationOpen', checkoutFunction)
  const createOrderCall = marketplaceSource.indexOf('await createMarketplaceCartOrder(', checkoutFunction)

  assert.ok(checkoutFunction >= 0)
  assert.ok(confirmationGuard > checkoutFunction)
  assert.ok(createOrderCall > confirmationGuard)
  assert.match(marketplaceSource, /setCheckoutConfirmationOpen\(true\)/)
  assert.match(marketplaceSource, /role="alertdialog"/)
  assert.match(marketplaceSource, /Xác nhận đặt món/)
})
