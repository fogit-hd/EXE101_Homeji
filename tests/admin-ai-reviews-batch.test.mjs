import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const api = readFileSync(new URL('../src/api/aiReviews.ts', import.meta.url), 'utf8')
const component = readFileSync(new URL('../src/components/admin/AiListingReviewPanel.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/components/admin/AiListingReviewPanel.css', import.meta.url), 'utf8')

test('aiReviews API client provides batch and single resolution with optional reasons', () => {
  assert.match(api, /resolveAiReview\s*=\s*\(id:\s*string,\s*restore:\s*boolean,\s*reason\?:/)
  assert.match(api, /resolveAllAiReviews\s*=\s*\(restore:\s*boolean,\s*reason\?:/)
  assert.match(api, /\/api\/admin\/ai-reviews\/resolve-all/)
  assert.match(api, /reason \? \{ restore, reason \} : \{ restore \}/)
})

test('AiListingReviewPanel provides asynchronous per-item review and bulk approve/reject with reason', () => {
  // Asynchronous per-item review: tracks pending item IDs rather than locking the full panel with busy
  assert.match(component, /pendingItemIds/)
  assert.match(component, /pendingItemIds\.has\(item\.id\)/)

  // Batch actions: Duyệt tất cả and Từ chối tất cả
  assert.match(component, /Duyệt tất cả/)
  assert.match(component, /Từ chối tất cả/)
  assert.match(component, /handleApproveAll/)
  assert.match(component, /handleConfirmRejectAll/)

  // Reason modal for rejecting all
  assert.match(component, /showRejectAllModal/)
  assert.match(component, /rejectAllReason/)
  assert.match(component, /Lý do từ chối \(bắt buộc\):/)
  assert.match(component, /ai-review-modal/)

  // Styles for batch bar and modal
  assert.match(styles, /\.ai-review-panel__queue-header/)
  assert.match(styles, /\.ai-review-panel__batch-actions/)
  assert.match(styles, /\.ai-review-modal-backdrop/)
  assert.match(styles, /\.ai-review-modal/)
})
