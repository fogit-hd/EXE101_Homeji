import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const { toggleRentalChoice, decisionMatchesChoices } = await import(reactDomModule('src/lib/rentalJourney.ts'))
test('consideration is capped at three distinct choices and can remove at capacity without retaining full listings', () => {
  let choices = []
  for (const id of ['a', 'b', 'c', 'd']) choices = toggleRentalChoice(choices, { postId: id, title: id, privateAddress: 'Do not retain' })
  assert.deepEqual(choices, ['a', 'b', 'c'].map(id => ({ postId: id, title: id })))
  choices = toggleRentalChoice(choices, { postId: 'b', title: 'b' })
  assert.deepEqual(choices.map(choice => choice.postId), ['a', 'c'])
  assert.equal(toggleRentalChoice(choices, { postId: '', title: 'bad' }), choices)
})
test('comparison coverage requires each selected ID to be either available or explicitly unavailable exactly once', () => {
  const response = (ids, unavailablePostIds = []) => ({ posts: ids.map(id => ({ post: { id } })), unavailablePostIds })
  assert.equal(decisionMatchesChoices(response(['a'], ['b']), ['a', 'b']), true)
  for (const data of [undefined, response([]), response(['a']), response(['a', 'c']), response(['a', 'a']), response(['a', 'b'], ['a'])]) {
    assert.equal(decisionMatchesChoices(data, ['a', 'b']), false)
  }
})

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const reactUrl = new URL('../node_modules/react/index.js', import.meta.url).href
const fixture = moduleUrl(`import React from '${reactUrl}';
export const useAuth=()=>globalThis.__journey.auth;
export const Link=({to,children,...props})=>React.createElement('a',{href:to,...props},children);
export const aiFeatureFlags={decisionTools:true,commute:false};
export function RentalDecisionPanel(props){globalThis.__journey.panel=props;return React.createElement('section',{'aria-label':'Controlled cost comparison'});}
`)
const overrides = { './AuthContext': fixture, 'react-router-dom': fixture, '../../lib/aiFeatureFlags': fixture, './RentalDecisionPanel': fixture }
const { RentalJourneyProvider } = await import(reactDomModule('src/contexts/RentalJourneyProvider.tsx', overrides))
const { useRentalJourney } = await import(reactDomModule('src/contexts/rental-journey.ts', overrides))
const { RentalConsiderationToggle } = await import(reactDomModule('src/components/ai/RentalConsiderationToggle.tsx', overrides))
const { RentalShortlistWorkspace, RentalJourneyTray } = await import(reactDomModule('src/components/ai/RentalJourney.tsx', overrides))
const { RentalAssistantComparisonContext } = await import(reactDomModule('src/contexts/rental-assistant-context.tsx', overrides))

test('cards, shared workspace and account scope use the same choices and scenario; account switches clear both', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const keys = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  globalThis.__journey = { auth: { isAuthenticated: true, profile: { id: 'a' } } }
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  let registered
  const register = selection => { registered = selection; return () => { registered = null } }
  function Snapshot() { globalThis.__journey.snapshot = useRentalJourney(); return null }
  const show = async workspace => act(async () => root.render(React.createElement(RentalJourneyProvider, null,
    React.createElement(RentalAssistantComparisonContext.Provider, { value: register },
      React.createElement(Snapshot),
      ...['a', 'b', 'c', 'd'].map(id => React.createElement(RentalConsiderationToggle, { key: id, post: { id, title: 'Phòng ' + id } })),
      React.createElement(RentalJourneyTray), workspace ? React.createElement(RentalShortlistWorkspace) : null))))
  const card = id => [...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.endsWith('Phòng ' + id))
  try {
    await show(false)
    await act(() => card('a').click())
    await act(() => card('b').click())
    await act(() => card('c').click())
    assert.equal(card('d').disabled, true)
    assert.equal(card('a').getAttribute('aria-pressed'), 'true')
    assert.equal(document.querySelector('.rental-journey-tray a').getAttribute('href'), '/?section=saved&view=considering')
    await show(true)
    assert.deepEqual(globalThis.__journey.panel.postIds, ['a', 'b', 'c'])
    assert.match(registered.title, /Phòng a · Phòng b · Phòng c/)
    await act(() => globalThis.__journey.panel.onScenarioChange({ ...globalThis.__journey.panel.scenario, occupants: 3, electricityKwh: 200 }))
    assert.equal(registered.scenario.occupants, 3)
    await show(false)
    await show(true)
    assert.equal(globalThis.__journey.panel.scenario.electricityKwh, 200, 'Navigation must not create a second scenario')
    await act(() => card('a').click())
    assert.equal(card('d').disabled, false)
    assert.deepEqual(registered.postIds, ['b', 'c'])
    globalThis.__journey.auth = { isAuthenticated: true, profile: { id: 'b' } }
    await show(true)
    assert.deepEqual(globalThis.__journey.snapshot.choices, [])
    assert.equal(globalThis.__journey.snapshot.scenario.occupants, 1)
    assert.equal(registered, null)
    globalThis.__journey.auth = { isAuthenticated: false, profile: null }
    await show(true)
    assert.equal(document.querySelector('button'), null)
    assert.equal(document.querySelector('.rental-journey-tray'), null)
  } finally {
    await act(() => root.unmount())
    dom.window.close()
    delete globalThis.__journey
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
