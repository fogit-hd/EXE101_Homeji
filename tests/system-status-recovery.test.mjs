import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { reactDomModule } from './helpers/react-dom-module.mjs'
import { THEMES, tokenContrast } from './helpers/theme-tokens.mjs'
import { restoreSavedPost } from '../src/pages/SavedPostsPage.recovery.ts'

const { MapToast } = await import(reactDomModule('src/components/map/MapToast.tsx'))
const stub = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href
const { SavedPostsPage } = await import(reactDomModule('src/pages/SavedPostsPage.tsx', {
  '@tanstack/react-query': stub('export const useQuery = () => globalThis.__savedFixture.useQuery(); export const useQueryClient = () => globalThis.__savedFixture.client'),
  'react-router-dom': stub('export const Link = () => null'),
  '../api': stub('export class ApiRequestError extends Error {} export const unsavePost = id => globalThis.__savedFixture.unsave(id); export const savePost = id => globalThis.__savedFixture.save(id); export const createInvitation = () => {}; export const getRoommateCandidates = () => {}; export const getSavedPosts = () => {}'),
  '../api/types': stub('export const UserRole = { Renter: 0 }; export const RentalPostType = { RoommateShare: 2 }'),
  '../lib/queryKeys': stub('export const savedPostsKey = id => ["saved", id]'),
  '../contexts/AuthContext': stub('export const useAuth = () => ({profile:{id:"test-owner",role:0},isAuthenticated:true})'),
  '../components/toast/PageNotice': stub('export const PageNotice = () => null'),
  '../components/skeletons/PageSkeletons': stub('export const RoommateCandidatesSkeleton = () => null; export const SavedSkeleton = () => null'),
  '../components/RentalPostCard': stub(`import React from '${reactUrl}'; export const RentalPostCard = props => React.createElement('button', {disabled:props.saveBusy,onClick:props.onUnsave,'data-room':props.post.id},props.post.id)`),
  '../components/ai/RentalJourney': stub('export const RentalShortlistWorkspace = () => null'),
  '../lib/aiFeatureFlags': stub('export const aiFeatureFlags = { decisionTools: false }'),
  '../lib/errors': stub('export const getErrorMessage = (_error, fallback) => fallback'),
}))

test('saved rooms roll back failed removal and failed undo, then restore a successful undo in place', async () => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true })
  const keys = ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  keys.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, writable: true,
    value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] }))
  const listeners = new Set()
  const fixture = {
    data: ['a', 'b', 'c'].map(id => ({ id, type: 0 })),
    useQuery() {
      const data = React.useSyncExternalStore(callback => { listeners.add(callback); return () => listeners.delete(callback) }, () => fixture.data)
      return { data, isError: false, isPending: false }
    },
    client: {
      cancelQueries: async () => {},
      getQueryData: () => fixture.data,
      setQueryData(_key, updater) { fixture.data = updater(fixture.data); listeners.forEach(listener => listener()) },
    },
  }
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
  let removal = deferred(), save = deferred()
  fixture.unsave = () => removal.promise
  fixture.save = () => save.promise
  globalThis.__savedFixture = fixture
  const root = createRoot(document.getElementById('root'))
  const rooms = () => [...document.querySelectorAll('[data-room]')].map(button => button.dataset.room)
  const remove = async id => act(async () => document.querySelector(`[data-room="${id}"]`).click())
  const undo = async () => act(async () => document.querySelector('.map-toast__action').click())
  try {
    await act(async () => root.render(React.createElement(SavedPostsPage, { embedded: true })))
    await remove('b')
    assert.deepEqual(rooms(), ['a', 'c'])
    await act(async () => removal.reject(new Error('offline')))
    assert.deepEqual(rooms(), ['a', 'b', 'c'])
    assert.match(document.body.textContent, /Không lưu được phòng\. Thử lại sau\./)
    removal = deferred()
    await remove('b')
    await act(async () => removal.resolve())
    assert.match(document.body.textContent, /Đã bỏ lưu/)
    await undo()
    assert.deepEqual(rooms(), ['a', 'b', 'c'])
    await act(async () => save.reject(new Error('offline')))
    assert.deepEqual(rooms(), ['a', 'c'])
    assert.match(document.body.textContent, /Không lưu được phòng\. Thử lại sau\./)
    removal = deferred(); save = deferred()
    await remove('c')
    await act(async () => removal.resolve())
    await undo()
    assert.deepEqual(rooms(), ['a', 'c'])
    await act(async () => save.resolve())
    assert.match(document.body.textContent, /Đã lưu phòng/)
  } finally {
    await act(async () => root.unmount())
    delete globalThis.__savedFixture
    keys.forEach((key, i) => previous[i] ? Object.defineProperty(globalThis, key, previous[i]) : delete globalThis[key])
    dom.window.close()
  }
})

test('undo restores the previous position without reverting other cache changes or duplicating a room', () => {
  const removed = { id: 'b' }
  const current = [{ id: 'a' }, { id: 'c' }, { id: 'new' }]
  assert.deepEqual(restoreSavedPost(current, removed, 1).map(post => post.id), ['a', 'b', 'c', 'new'])
  assert.deepEqual(current.map(post => post.id), ['a', 'c', 'new'])
  assert.deepEqual(restoreSavedPost([], removed, 10), [removed])
  assert.deepEqual(restoreSavedPost(current, removed, -1).map(post => post.id), ['b', 'a', 'c', 'new'])
  const restored = restoreSavedPost(current, removed, 1)
  assert.equal(restoreSavedPost(restored, removed, 1), restored)
})

test('toast action is keyboard reachable, never steals focus, and pauses expiry on hover or focus', async () => {
  const dom = new JSDOM('<div id="root"></div><button id="outside">Outside</button>', { pretendToBeVisual: true })
  const keys = ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT']
  const previous = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  keys.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, writable: true,
    value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] }))
  let now = 0, nextId = 0, dismissed = 0, undone = 0
  const timers = new Map()
  dom.window.setTimeout = (callback, delay) => { const id = ++nextId; timers.set(id, { callback, at: now + delay }); return id }
  dom.window.clearTimeout = id => timers.delete(id)
  dom.window.requestAnimationFrame = callback => dom.window.setTimeout(callback, 0)
  dom.window.cancelAnimationFrame = dom.window.clearTimeout
  const tick = async ms => act(async () => {
    now += ms
    for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback() }
  })
  const outside = document.getElementById('outside')
  outside.focus()
  const root = createRoot(document.getElementById('root'))
  const props = { message: 'Đã bỏ lưu', action: { label: 'Hoàn tác', onClick: () => undone++ },
    durationMs: 1000, onDismiss: () => dismissed++ }
  try {
    await act(async () => root.render(React.createElement(MapToast, props)))
    await tick(0)
    assert.equal(document.activeElement, outside, 'toast must not steal focus')
    const toast = document.querySelector('[role="status"]')
    const action = document.querySelector('.map-toast__action')
    assert.equal(toast.getAttribute('aria-hidden'), 'false')
    assert.equal(action.tabIndex, 0)
    await tick(5999)
    assert.equal(dismissed, 0, 'action toast has a minimum six-second lifetime')
    await act(async () => toast.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })))
    await tick(10000)
    assert.equal(dismissed, 0)
    await act(async () => action.focus())
    await act(async () => toast.dispatchEvent(new dom.window.MouseEvent('mouseout', { bubbles: true, relatedTarget: outside })))
    await tick(10000)
    assert.equal(dismissed, 0)
    // Native button activation uses the same click handler for Enter/Space.
    await act(async () => action.click())
    assert.equal(undone, 1)
    await act(async () => outside.focus())
    await tick(6000)
    assert.equal(dismissed, 1)
    await act(async () => root.render(React.createElement(MapToast, { message: null })))
    assert.equal(toast.getAttribute('inert'), '')
    await tick(340)
    assert.equal(document.querySelector('[role="status"]'), null)
  } finally {
    await act(async () => root.unmount())
    keys.forEach((key, i) => previous[i] ? Object.defineProperty(globalThis, key, previous[i]) : delete globalThis[key])
    dom.window.close()
  }
})

test('map skeleton and toast actions use readable tokens in both themes and reduced motion', () => {
  for (const theme of THEMES) {
    for (const background of ['--surface-muted', '--surface-elevated']) {
      assert.ok(tokenContrast('--text-heading', background, theme) >= 4.5, `${theme} ${background}`)
    }
  }
  const css = readFileSync('src/components/map/RentalMap.css', 'utf8')
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.match(css, /\.rental-map__loader::before\s*\{\s*animation: none/)
  const map = readFileSync('src/components/map/RentalMap.tsx', 'utf8')
  assert.match(map, /addListenerOnce\(map, 'idle', \(\) => setMapIdle\(true\)\)/)
  for (const label of ['Lớp bản đồ', 'Vị trí của tôi', 'Phóng to', 'Thu nhỏ']) {
    assert.ok(map.includes(`aria-label="${label}"`))
    assert.ok(map.includes(`title="${label}"`))
  }
  const listings = readFileSync('src/components/map/listings/MapListingsWorkspace.tsx', 'utf8')
  const errorState = listings.slice(listings.indexOf('{error ? ('), listings.indexOf(') : loading && cards.length'))
  assert.match(errorState, /onRefresh\?\.\(\)/)
  assert.doesNotMatch(errorState, /resetFilters/)
})
