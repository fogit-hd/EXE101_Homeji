import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  LISTING_REPORT_REASONS,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_REASON_MAX_LENGTH,
  validateListingReport,
} from '../src/lib/listingReport.ts'

test('a reason is required', () => {
  assert.deepEqual(validateListingReport({ reasonId: null, description: '' }), { ok: false, error: 'Chọn một lý do báo cáo.' })
})

test('preset reasons send their Vietnamese label and drop blank descriptions', () => {
  assert.deepEqual(validateListingReport({ reasonId: 'scam', description: '   ' }), {
    ok: true,
    reason: 'Có dấu hiệu lừa đảo hoặc đòi chuyển tiền trước',
    description: undefined,
  })
})

test('"other" needs a description so moderators can act', () => {
  assert.equal(validateListingReport({ reasonId: 'other', description: ' ' }).ok, false)
  assert.deepEqual(validateListingReport({ reasonId: 'other', description: '  Số điện thoại không liên lạc được ' }), {
    ok: true,
    reason: 'Lý do khác',
    description: 'Số điện thoại không liên lạc được',
  })
})

test('descriptions over the backend limit are rejected', () => {
  const result = validateListingReport({ reasonId: 'spam', description: 'a'.repeat(REPORT_DESCRIPTION_MAX_LENGTH + 1) })
  assert.equal(result.ok, false)
})

test('every reason label fits the backend reason column', () => {
  for (const reason of LISTING_REPORT_REASONS) assert.ok(reason.label.length <= REPORT_REASON_MAX_LENGTH, reason.id)
})

test('room detail offers reporting through the shared report API', () => {
  const modal = readFileSync(new URL('../src/components/map/listings/RoomDetailModal.tsx', import.meta.url), 'utf8')
  const button = readFileSync(new URL('../src/components/map/listings/ReportListingButton.tsx', import.meta.url), 'utf8')
  assert.match(modal, /<ReportListingButton key=\{post\.id\} postId=\{post\.id\} ownerId=\{post\.ownerId\}/)
  // The detail panel reloads after login, so the pending open must live in the parent, not in an auth callback.
  assert.match(modal, /openRequested=\{reportAfterLoginFor === post\.id\}/)
  assert.match(button, /onSuccess: onAuthRequired/)
  assert.match(button, /createReport\(/)
  assert.match(button, /ReportTargetType\.RentalPost/)
  assert.match(button, /intent: 'report'/)
  assert.match(button, /if \(isOwner\) return null/)
})
