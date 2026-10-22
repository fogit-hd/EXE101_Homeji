import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

// Execute the actual shell. Substitute only its API, map/UI children and external hooks.
const stub = 'data:text/javascript;base64,' + Buffer.from(`
const f = () => globalThis.__mapViewerFixture;
export const useAuth = () => ({ isAuthenticated: true, profile: { id: f().viewer } });
export const useSearch = () => f().search;
export const useSearchParams = () => [f().params, f().noop];
export const useChatbotSurface = () => {};
export const useNotificationHub = () => {};
export const getRentalPost = (id, options) => new Promise(resolve => f().requests.push({ id, options, resolve }));
export const getNotifications = async () => [];
export const getSavedPosts = async () => [];
export const searchMarketplacePosts = async () => [];
export const savePost = async () => {};
export const unsavePost = async () => {};
export const NotificationType = {};
export const DEFAULT_MAP_CENTER = { lat: 10.8, lng: 106.8 };
export const MAP_FOCUS_ZOOM = 16;
export const isValidCoord = () => true;
export const buildSyntheticMapPlace = value => value;
export const fetchMapPlaceDetails = async () => null;
export const marketplacePostsToSellerPins = () => [];
export const nearbyPanelAnchor = () => null;
export const marketplacePostsToListingPins = () => [];
export const parseFiltersFromURL = () => ({ catalog: 'rental' });
export const serializeFiltersToQuery = () => '';
export const isWideMapSection = () => false;
export const MapPlaceDetailPanel = props => { f().details.push(props); return null; };
export const Link = () => null;
export const DeferredMapBlock = () => null;
export const HomeListingSkeleton = () => null;
export const MapListingCard = () => null;
export const PageNotice = () => null;
export const HomeMapStage = () => null;
export const MapListingsWorkspace = () => null;
export const RoomDetailModal = () => null;
export const MapAppPanel = () => null;
export const MapEdgeToggle = () => null;
export const MapNearbyPanel = () => null;
export const MapToast = () => null;
`).toString('base64')
const seams = ['react-router-dom', '../../api', '../../contexts/AuthContext', '../../contexts/chatbot-surface',
  '../../contexts/SearchContext', '../../hooks/useNotificationHub', '../../lib/googleMaps', '../../lib/mapPlace',
  '../../lib/marketplaceSellerPins', '../../lib/nearbyPanelAnchor', '../chrome', '../HomeListingSkeleton',
  '../MapListingCard', '../toast/PageNotice', './HomeMapStage', './listings/listingAdapters',
  './listings/MapListingsWorkspace', './listings/RoomDetailModal', './MapAppPanel', './MapAppPanel.logic',
  './MapEdgeToggle', './MapNearbyPanel', './MapPlaceDetailPanel', './MapToast']
const reactUrl = new URL('../node_modules/react/index.js', import.meta.url).href
const motionStub = 'data:text/javascript;base64,' + Buffer.from(`import React from '${reactUrl}';export const AnimatePresence=({children})=>children;export const motion={div:({initial,animate,exit,variants,transition,...props})=>React.createElement('div',props)}`).toString('base64')
const { AuthenticatedHomeMapShell } = await import(reactDomModule('src/components/map/AuthenticatedHomeMapShell.tsx', { ...Object.fromEntries(seams.map(path => [path, stub])), 'motion/react': motionStub }))
const publicPost = { id: 'pass-room', type: 3, title: 'Phòng pass', address: 'Khu vực Thủ Đức', latitude: 10.84, longitude: 106.8, price: 3000000 }
const privatePost = { ...publicPost, address: 'ĐỊA CHỈ CHỈ CHỦ TIN ĐƯỢC ĐỌC', latitude: 10.843219, ownerConsentContact: 'CONTACT RIÊNG TƯ' }

async function environment() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://fixture.local' })
  const previous = new Map(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT', '__mapViewerFixture'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  const noop = () => {}
  const fixture = { viewer: 'owner-a', requests: [], details: [], noop, params: new URLSearchParams(),
    search: { setNearbyAnchor: noop, nearbyCategory: 'food', setNearbyCategory: noop } }
  globalThis.__mapViewerFixture = fixture
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(document.getElementById('root'))
  let renderNonce = 0
  const render = viewer => act(async () => {
    fixture.viewer = viewer
    root.render(React.createElement(AuthenticatedHomeMapShell, {
      posts: [publicPost], selectedPostId: publicPost.id, selectedPost: publicPost,
      onSelectPost: noop, onClearSelection: noop, focus: null, focusToken: ++renderNonce,
      userLocation: null, onLocate: noop, locating: false, locationError: '', panelOpen: false,
      panelSection: null, closePanel: noop, loading: false, showPostsLoader: false, error: '',
      onResetFilters: noop, onRetry: noop, needsProfileSetup: false, omnibox: null,
    }))
  })
  return { fixture, render, async cleanup() {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  } }
}

test('switching account immediately removes the previous viewer private detail while refetch is pending', async () => {
  const env = await environment()
  try {
    await env.render('owner-a')
    await act(async () => env.fixture.requests[0].resolve(privatePost))
    assert.equal(env.fixture.details.at(-1).listing.address, privatePost.address)
    const beforeSwitch = env.fixture.details.length
    await env.render('renter-b')
    assert.equal(env.fixture.requests.length, 2)
    assert.equal(env.fixture.requests[0].options.signal.aborted, true)
    for (const props of env.fixture.details.slice(beforeSwitch)) {
      assert.equal(props.listing, null)
      assert.equal(props.listingSummary, publicPost)
      assert.doesNotMatch(JSON.stringify([props.listing, props.listingSummary]), /ĐỊA CHỈ CHỈ CHỦ|CONTACT RIÊNG/)
    }
    await act(async () => env.fixture.requests[1].resolve(publicPost))
    assert.equal(env.fixture.details.at(-1).listing.address, publicPost.address)
  } finally { await env.cleanup() }
})

test('an old viewer response cannot restore private detail even if the provider ignores abort', async () => {
  const env = await environment()
  try {
    await env.render('owner-a')
    await env.render('renter-b')
    assert.equal(env.fixture.requests[0].options.signal.aborted, true)
    await act(async () => env.fixture.requests[1].resolve(publicPost))
    const beforeLateResponse = env.fixture.details.length
    await act(async () => env.fixture.requests[0].resolve(privatePost))
    assert.equal(env.fixture.details.at(-1).listing.address, publicPost.address)
    assert.ok(env.fixture.details.slice(beforeLateResponse).every(props => props.listing?.address !== privatePost.address))
  } finally { await env.cleanup() }
})
