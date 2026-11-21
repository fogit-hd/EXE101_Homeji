import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { reactDomModule } from './helpers/react-dom-module.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = (rel) => path.join(rootDir, 'src', rel)

const PageSkeletons = await import(reactDomModule(src('components/skeletons/PageSkeletons.tsx')))
const { MarketplaceLoadingSkeleton, FoodCatalogSkeleton } = await import(
  reactDomModule(src('components/MarketplaceLoadingSkeleton.tsx'))
)
const { ContentSkeleton } = await import(reactDomModule(src('components/ContentSkeleton.tsx')))

const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(Component, props))

test('all PageSkeletons, MarketplaceLoadingSkeleton, and ContentSkeleton variants render cleanly without interactive controls', () => {
  const renders = [
    render(PageSkeletons.AuthSkeleton, { mode: 'login' }),
    render(PageSkeletons.AuthSkeleton, { mode: 'register' }),
    render(PageSkeletons.AuthSkeleton, { mode: 'verify' }),
    render(PageSkeletons.AuthSkeleton, { mode: 'recovery' }),
    render(PageSkeletons.HubSkeleton),
    render(PageSkeletons.HubBodySkeleton),
    render(PageSkeletons.ListingsSkeleton),
    render(PageSkeletons.MessagesSkeleton),
    render(PageSkeletons.ConversationListSkeleton),
    render(PageSkeletons.NotificationsSkeleton, { withHeader: true, tabs: true }),
    render(PageSkeletons.NotificationsSkeleton, { withHeader: false, tabs: false }),
    render(PageSkeletons.PaymentsSkeleton, { withHeader: true }),
    render(PageSkeletons.MyPostsSkeleton, { withHeader: false }),
    render(PageSkeletons.InvitationsSkeleton, { withHeader: false }),
    render(PageSkeletons.InvitationsSkeleton, { withHeader: true }),
    render(PageSkeletons.RoommateRoomsSkeleton),
    render(PageSkeletons.ProfileSkeleton, { withHeader: true }),
    render(PageSkeletons.SavedSkeleton, { withHeader: false }),
    render(PageSkeletons.AppointmentsSkeleton, { withHeader: true }),
    render(PageSkeletons.AppointmentListSkeleton),
    render(PageSkeletons.WantedSkeleton, { withHeader: false, form: false }),
    render(PageSkeletons.WantedSkeleton, { withHeader: true, form: false }),
    render(PageSkeletons.WantedSkeleton, { withHeader: false, form: true }),
    render(PageSkeletons.ActivitiesSkeleton, { withHeader: false }),
    render(PageSkeletons.ActivitiesSkeleton, { withHeader: true }),
    render(PageSkeletons.PostFormSkeleton, { withHeader: false }),
    render(PageSkeletons.PostFormSkeleton, { withHeader: true }),
    render(PageSkeletons.PaymentWaitSkeleton),
    render(PageSkeletons.AdminSkeleton, { withHeader: false }),
    render(PageSkeletons.AdminSkeleton, { withHeader: true }),
    render(PageSkeletons.LegalSkeleton),
    render(PageSkeletons.AdminAnalyticsSkeleton),
    render(PageSkeletons.RoommateCandidatesSkeleton, { count: 2 }),
    render(FoodCatalogSkeleton),
    render(ContentSkeleton, { variant: 'list', count: 3 }),
    render(ContentSkeleton, { variant: 'detail', compact: true }),
  ]

  for (const tab of ['food', 'browse', 'purchases', 'mine', 'sell', 'sales', 'wallet']) {
    renders.push(render(PageSkeletons.MarketplaceSkeleton, { tab, withHeader: true }))
    renders.push(render(MarketplaceLoadingSkeleton, { tab }))
  }
  for (const walletView of ['topup', 'withdraw', 'history']) {
    renders.push(render(MarketplaceLoadingSkeleton, { tab: 'wallet', walletView }))
  }

  for (const html of renders) {
    assert.ok(html.length > 0, 'Skeleton should emit non-empty markup')
    assert.doesNotMatch(html, /<(button|input|select|textarea|a)\b/i, 'Skeletons must not render interactive controls')
  }
})

test('embedded skeletons omit duplicated headers, tabs, filter boxes, and metrics when withHeader=false', () => {
  const invitations = render(PageSkeletons.InvitationsSkeleton, { withHeader: false })
  assert.ok(!invitations.includes('sk-tabs'), 'InvitationsSkeleton(withHeader=false) should not duplicate filter tabs')
  assert.ok(!invitations.includes('sk-header'), 'InvitationsSkeleton(withHeader=false) should not duplicate header')

  const wanted = render(PageSkeletons.WantedSkeleton, { withHeader: false, form: false })
  assert.ok(!wanted.includes('sk-tabs'), 'WantedSkeleton(withHeader=false) should not duplicate tabs')
  assert.ok(!wanted.includes('height:28px'), 'WantedSkeleton(withHeader=false) should not duplicate page header')
  assert.ok(!wanted.includes('width:70%'), 'WantedSkeleton(withHeader=false) should not duplicate filter box')

  const activities = render(PageSkeletons.ActivitiesSkeleton, { withHeader: false })
  assert.ok(!activities.includes('sk-header'), 'ActivitiesSkeleton(withHeader=false) should not duplicate header')

  const adminQueue = render(PageSkeletons.AdminSkeleton, { withHeader: false })
  assert.ok(!adminQueue.includes('sk-metrics'), 'AdminSkeleton(withHeader=false) should not render summary metrics on queue views')
  assert.ok(!adminQueue.includes('sk-tabs'), 'AdminSkeleton(withHeader=false) should not render duplicate tabs')
  assert.ok(adminQueue.includes('sk-admin-card'), 'AdminSkeleton(withHeader=false) should render queue cards')

  const adminRoot = render(PageSkeletons.AdminSkeleton, { withHeader: true })
  assert.ok(adminRoot.includes('sk-metrics'), 'AdminSkeleton(withHeader=true) should include KPI metrics')

  const postForm = render(PageSkeletons.PostFormSkeleton, { withHeader: false })
  assert.ok(!postForm.includes('sk-header'), 'PostFormSkeleton(withHeader=false) should not duplicate PageFrame header')
  assert.equal((postForm.match(/width:110px;height:8px/g) || []).length, 3, 'PostFormSkeleton should show 3 steps')
})

test('updated skeletons reflect exact desktop and mobile page compositions', () => {
  const listings = render(PageSkeletons.ListingsSkeleton)
  assert.ok(listings.includes('sk-listings__toolbar'))
  assert.ok(listings.includes('sk-listings__chips'))
  assert.ok(listings.includes('sk-listings__body'))
  assert.ok(listings.includes('sk-listings__map'))
  assert.ok(listings.includes('sk-listings__panel'))

  const profile = render(PageSkeletons.ProfileSkeleton, { withHeader: true })
  assert.ok(profile.includes('sk-profile__banner'))
  assert.ok(profile.includes('sk-profile__details'))
  assert.ok(profile.includes('sk-profile__links'))

  const myPosts = render(PageSkeletons.MyPostsSkeleton, { withHeader: false })
  assert.ok(myPosts.includes('sk-owner-card'))
  assert.ok(myPosts.includes('sk-owner-card__actions'))

  const roommateRooms = render(PageSkeletons.RoommateRoomsSkeleton)
  assert.ok(roommateRooms.includes('sk-rm-card'))
  assert.ok(roommateRooms.includes('sk-rm-card__band'))
  assert.ok(!roommateRooms.includes('sk-room-card__media'), 'RoommateRoomsSkeleton must match rm-card instead of photo RoomCard')

  const appointments = render(PageSkeletons.AppointmentsSkeleton, { withHeader: true })
  assert.ok(appointments.includes('sk-appt-item'))

  const paymentWait = render(PageSkeletons.PaymentWaitSkeleton)
  assert.ok(paymentWait.includes('sk-pay-wait'))
  assert.ok(paymentWait.includes('sk-pay-wait__main'))
  assert.ok(paymentWait.includes('sk-pay-wait__details'))

  const payments = render(PageSkeletons.PaymentsSkeleton, { withHeader: true })
  assert.ok(payments.includes('sk-pay__current'))
  assert.ok(payments.includes('sk-pay__plans'))
  assert.ok(!payments.includes('sk-table-row'), 'PaymentsSkeleton plans tab should not render redundant history table rows')

  const foodMarket = render(MarketplaceLoadingSkeleton, { tab: 'food' })
  assert.ok(foodMarket.includes('marketplace-loading-skeleton'))
  assert.ok(foodMarket.includes('food-skeleton-grid'))
  assert.ok(foodMarket.includes('sk-food-seller'))
  assert.ok(foodMarket.includes('food-skeleton-card'))
  assert.ok(!foodMarket.includes('marketplace-skeleton__seller'))

  const sellMarket = render(MarketplaceLoadingSkeleton, { tab: 'sell' })
  assert.ok(sellMarket.includes('marketplace-skeleton__sell'))

  const orderMarket = render(MarketplaceLoadingSkeleton, { tab: 'purchases' })
  assert.ok(orderMarket.includes('marketplace-skeleton__order'))

  const walletMarket = render(MarketplaceLoadingSkeleton, { tab: 'wallet' })
  assert.ok(walletMarket.includes('marketplace-skeleton__wallet-overview'))
  assert.ok(walletMarket.includes('marketplace-skeleton__wallet-workspace'))

  const contentList = render(ContentSkeleton, { variant: 'list' })
  assert.ok(contentList.includes('content-skeleton__row'))
  assert.ok(!contentList.includes('content-skeleton__form'))
  assert.ok(!contentList.includes('content-skeleton__metrics'))
})

test('pages wire the matching skeletons without stale ContentSkeleton or dead CSS', () => {
  const savedPage = readFileSync(src('pages/SavedPostsPage.tsx'), 'utf8')
  assert.ok(!savedPage.includes('ContentSkeleton'))
  assert.ok(savedPage.includes('<SavedSkeleton />'))
  assert.ok(savedPage.includes('<RoommateCandidatesSkeleton count={2} />'))

  const editPostPage = readFileSync(src('pages/EditRentalPostPage.tsx'), 'utf8')
  assert.ok(editPostPage.includes('<PostFormSkeleton withHeader={false} />'))

  const roommatePeople = readFileSync(src('components/roommates/RoommatePeople.tsx'), 'utf8')
  assert.ok(roommatePeople.includes('<InvitationsSkeleton />'))

  const sourceResults = readFileSync(src('components/map/listings/RentalSourceResults.tsx'), 'utf8')
  assert.ok(sourceResults.includes('sk-source-card'))

  const hubCss = readFileSync(src('components/hub/AuthenticatedHub.css'), 'utf8')
  assert.ok(!hubCss.includes('.hub-skel'))
})
