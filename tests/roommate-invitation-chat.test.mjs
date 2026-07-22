import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const invitationsPage = readFileSync(
  new URL('../src/pages/RoommateInvitationsPage.tsx', import.meta.url),
  'utf8',
)
const appPanel = readFileSync(
  new URL('../src/components/map/MapAppPanel.tsx', import.meta.url),
  'utf8',
)

test('roommate invitations show a human-readable listing title instead of a UUID', () => {
  assert.match(invitationsPage, /inv\.rentalPostTitle/)
  assert.doesNotMatch(invitationsPage, /rentalPostId\.slice/)
})

test('accepted invitation opens its exact conversation from the invitations panel', () => {
  assert.match(invitationsPage, /onOpenConversation\?\.\(inv\.conversationId\)/)
  assert.match(appPanel, /onOpenConversation=\{onOpenConversation\}/)
})
