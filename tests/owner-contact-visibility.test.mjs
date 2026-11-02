import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

test('guests see branded contact buttons without fetching or exposing private destinations', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test' })
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  let requests = 0, prompts = 0
  globalThis.__contactPrompt = () => prompts++
  globalThis.__contactFetch = () => { requests++; throw Error('Guest must not fetch contact profile') }
  const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  const { OwnerSocialContacts } = await import(reactDomModule(path.resolve('src/components/profile/OwnerSocialContacts.tsx'), {
    '../../contexts/AuthContext': moduleUrl('export const useAuth=()=>({isAuthenticated:false,isLoading:false})'),
    '../../contexts/AuthModalContext.logic': moduleUrl('export const useAuthModal=()=>({openAuthModal:globalThis.__contactPrompt})'),
    '../../api/profileContacts': moduleUrl('export const getPublicContactProfile=globalThis.__contactFetch'),
    '../../lib/errors': moduleUrl('export const getErrorMessage=()=>"Contact failed"'),
  }))
  const root = createRoot(document.getElementById('root'))
  try {
    await act(async () => root.render(React.createElement(OwnerSocialContacts, { userId: 'owner' })))
    const buttons = [...document.querySelectorAll('button')]
    assert.equal(buttons.length, 2)
    assert.equal(document.querySelectorAll('button svg').length, 2)
    assert.match(buttons[0].textContent, /Facebook/)
    assert.match(buttons[1].textContent, /Zalo/)
    assert.equal(document.querySelectorAll('a[href]').length, 0)
    for (const button of buttons) await act(async () => button.click())
    assert.equal(prompts, 2)
    assert.equal(requests, 0)
  } finally {
    await act(async () => root.unmount())
    globalThis.window = previous.window; globalThis.document = previous.document; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
    delete globalThis.__contactPrompt; delete globalThis.__contactFetch; dom.window.close()
  }
})
