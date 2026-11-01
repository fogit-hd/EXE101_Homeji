import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const authUrl = 'data:text/javascript;base64,' + Buffer.from('export const useAuth=()=>globalThis.__profileGateAuth').toString('base64')
const overrides = { '../../contexts/AuthContext': authUrl, '../contexts/AuthContext': authUrl }
const { ProfileGate } = await import(reactDomModule('src/components/auth/ProfileGate.tsx', overrides))
const { ProtectedRoute } = await import(reactDomModule('src/components/ProtectedRoute.tsx', overrides))

test('required-profile surfaces do not mount feature effects and resume after the basic profile is saved', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test' })
  const previous = new Map(['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', '__profileGateAuth'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  let mounts = 0
  function Feature() { useEffect(() => { mounts++ }, []); return React.createElement('p', null, 'Tính năng đã sẵn sàng') }
  const root = createRoot(document.getElementById('root'))
  try {
    for (const Gate of [ProfileGate, ProtectedRoute]) {
      globalThis.__profileGateAuth = { isAuthenticated: true, isLoading: false, needsProfileSetup: true, profile: null, refreshProfile: async () => {} }
      const render = async () => act(async () => root.render(React.createElement(MemoryRouter, { key: Gate.name, initialEntries: ['/?section=marketplace&market=wallet'] }, React.createElement(Gate, { action: 'sử dụng ví' }, React.createElement(Feature)))))
      const before = mounts
      await render()
      assert.equal(mounts, before, 'Blocked feature must not run loading or write effects')
      const link = document.querySelector('a')
      assert.equal(link.textContent, 'Cập nhật hồ sơ')
      assert.equal(new URL(link.href).searchParams.get('returnTo'), '/?section=marketplace&market=wallet')
      globalThis.__profileGateAuth = { ...globalThis.__profileGateAuth, needsProfileSetup: false, profile: { id: 'saved', onboardingCompleted: false } }
      await render()
      assert.equal(mounts, before + 1, 'Optional lifestyle onboarding must not block a saved basic profile')
      assert.ok(document.body.textContent.includes('Tính năng đã sẵn sàng'))
    }
    globalThis.__profileGateAuth = { isAuthenticated: true, isLoading: false, needsProfileSetup: true, profile: null }
    await act(async () => root.render(React.createElement(MemoryRouter, { key: 'profile', initialEntries: ['/profile'] }, React.createElement(ProtectedRoute, null, React.createElement(Feature)))))
    assert.ok(document.body.textContent.includes('Tính năng đã sẵn sàng'), 'The profile editor must stay accessible without a profile')
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
