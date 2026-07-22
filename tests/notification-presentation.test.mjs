import assert from 'node:assert/strict'
import test from 'node:test'
import { NotificationType } from '../src/api/types.ts'
import { getNotificationPresentation } from '../src/lib/notificationPresentation.ts'

const notification = (type, title = '', message = '') => ({ type, title, message })

test('notification types map to accessible importance levels', () => {
  assert.equal(getNotificationPresentation(notification(NotificationType.PostRejected)).importance, 'critical')
  assert.equal(getNotificationPresentation(notification(NotificationType.ViewingAppointmentRequested)).importance, 'attention')
  assert.equal(getNotificationPresentation(notification(NotificationType.PostApproved)).importance, 'success')
  assert.equal(getNotificationPresentation(notification(NotificationType.NewMessage)).importance, 'info')
})

test('status wording refines generic update notifications', () => {
  assert.equal(
    getNotificationPresentation(notification(NotificationType.MarketplaceOrderUpdated, 'Đơn hàng đã hủy')).importance,
    'critical',
  )
  assert.equal(
    getNotificationPresentation(notification(NotificationType.MarketplaceOrderUpdated, 'Đơn Chợ Homeji đã hết hạn')).importance,
    'critical',
  )
  assert.equal(
    getNotificationPresentation(notification(NotificationType.LandlordVerificationUpdated, 'Hồ sơ đã được duyệt')).importance,
    'success',
  )
})
