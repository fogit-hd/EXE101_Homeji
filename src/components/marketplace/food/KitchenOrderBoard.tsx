import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MarketplaceOrderStatus, type MarketplaceOrder } from '../../../api/types'
import { SellerOrderSound } from '../../../lib/sellerOrderSound'

export interface KitchenOrderBoardProps {
  orders: MarketplaceOrder[]
  busyGroupKey?: string | null
  onAcceptOrder: (orderId: string) => Promise<void>
  onRejectOrder: (orderId: string) => Promise<void>
  onDeliverOrder: (orderId: string) => Promise<void>
  onContactCustomer?: (postId: string, orderId: string) => void
}

export const KitchenOrderBoard: React.FC<KitchenOrderBoardProps> = ({
  orders,
  busyGroupKey,
  onAcceptOrder,
  onRejectOrder,
  onDeliverOrder,
  onContactCustomer,
}) => {
  const [isOpenNow, setIsOpenNow] = useState<boolean>(() => {
    const saved = localStorage.getItem('homeji_kitchen_is_open')
    return saved !== null ? saved === 'true' : true
  })
  const [now, setNow] = useState<number>(Date.now())
  const soundRef = useRef<SellerOrderSound | null>(null)

  useEffect(() => {
    soundRef.current = new SellerOrderSound()
    return () => {
      soundRef.current?.dispose()
      soundRef.current = null
    }
  }, [])

  const playAlertSound = useCallback(() => {
    if (soundRef.current) {
      if (!soundRef.current.ready) {
        void soundRef.current.arm().then((ready) => {
          if (ready) soundRef.current?.play()
        })
      } else {
        soundRef.current.play()
      }
    }
  }, [])

  const toggleOpenStatus = () => {
    const next = !isOpenNow
    setIsOpenNow(next)
    localStorage.setItem('homeji_kitchen_is_open', String(next))
    void soundRef.current?.arm().then(() => playAlertSound())
  }

  // Filter orders by status
  const requestedOrders = orders.filter((o) => o.status === MarketplaceOrderStatus.Requested)
  const preparingOrders = orders.filter((o) => o.status === MarketplaceOrderStatus.Accepted)
  const readyOrDeliveredOrders = orders.filter(
    (o) => o.status === MarketplaceOrderStatus.Delivered || o.status === MarketplaceOrderStatus.Completed
  )

  // Countdown timer ticker
  useEffect(() => {
    if (requestedOrders.length === 0) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [requestedOrders.length])

  // Play sound if new requested order arrives
  useEffect(() => {
    if (requestedOrders.length > 0) {
      playAlertSound()
    }
  }, [requestedOrders.length, playAlertSound])

  return (
    <div
      className="kitchen-order-board"
      style={{
        marginBottom: '28px',
        backgroundColor: 'var(--surface-1, #ffffff)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top Bar: Master Kitchen Status */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '16px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Bảng Điều Khiển Bếp Sinh Viên</h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
            Quản lý nhận đơn, thời gian nấu và bàn giao món theo thời gian thực.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={toggleOpenStatus}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: isOpenNow ? '#dcfce7' : '#fee2e2',
              color: isOpenNow ? '#15803d' : '#b91c1c',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isOpenNow ? '#22c55e' : '#ef4444',
                display: 'inline-block',
              }}
            />
            {isOpenNow ? 'Bếp Đang Mở Nhận Đơn' : 'Tạm Ngưng Nhận Đơn'}
          </button>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Column 1: Đơn Mới Đến */}
        <div
          style={{
            backgroundColor: 'var(--surface-2, #f8fafc)',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <strong style={{ fontSize: '0.9rem', color: '#b45309' }}>
              ĐƠN MỚI ĐẾN ({requestedOrders.length})
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
              Đếm ngược 30p
            </span>
          </div>

          {requestedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
              Không có đơn mới cần xử lý
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requestedOrders.map((order) => {
                const isBusy = busyGroupKey === order.id
                const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : now
                const elapsedMs = Math.max(0, now - createdMs)
                const timeoutMs = 30 * 60 * 1000
                const remainingMs = Math.max(0, timeoutMs - elapsedMs)
                const isExpired = remainingMs <= 0
                const remainingMinutes = Math.floor(remainingMs / 60000)
                const remainingSeconds = Math.floor((remainingMs % 60000) / 1000)
                const countdownLabel = isExpired
                  ? 'Hết hạn nhận đơn (30p)'
                  : `Còn ${remainingMinutes}:${String(remainingSeconds).padStart(2, '0')}`

                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: 'var(--surface-1, #ffffff)',
                      borderRadius: '10px',
                      padding: '12px',
                      border: '1px solid #fde68a',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{order.postTitle || 'Món ăn'}</strong>
                      <span style={{ color: 'var(--color-primary, #0284c7)', fontWeight: 700, fontSize: '0.9rem' }}>
                        {(order.agreedPrice || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '100px',
                          backgroundColor: isExpired ? '#fee2e2' : '#fef3c7',
                          color: isExpired ? '#dc2626' : '#b45309',
                        }}
                      >
                        {countdownLabel}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginBottom: '8px' }}>
                      <div>Số lượng: {order.quantity || 1} suất</div>
                      {order.pickupAddress && <div>Địa chỉ: {order.pickupAddress}</div>}
                      {order.note && <div style={{ color: '#b45309' }}>Ghi chú: "{order.note}"</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={isBusy}
                        onClick={() => {
                          playAlertSound()
                          void onAcceptOrder(order.id)
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isBusy ? 'Đang xử lý…' : 'Nhận & Nấu'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={isBusy}
                        onClick={() => void onRejectOrder(order.id)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Từ chối
                      </button>
                      {onContactCustomer && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onContactCustomer(order.marketplacePostId, order.id)}
                          style={{
                            backgroundColor: 'var(--surface-2, #f1f5f9)',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                          title="Nhắn tin với khách"
                        >
                          Chat
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Column 2: Đang Nấu */}
        <div
          style={{
            backgroundColor: 'var(--surface-2, #f8fafc)',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <strong style={{ fontSize: '0.9rem', color: '#0369a1' }}>
              ĐANG NẤU ({preparingOrders.length})
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
              Theo ca bếp
            </span>
          </div>

          {preparingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
              Chưa có món nào đang nấu
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {preparingOrders.map((order) => {
                const isBusy = busyGroupKey === order.id
                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: 'var(--surface-1, #ffffff)',
                      borderRadius: '10px',
                      padding: '12px',
                      border: '1px solid #bae6fd',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{order.postTitle || 'Món ăn'}</strong>
                      <span style={{ color: 'var(--color-primary, #0284c7)', fontWeight: 700, fontSize: '0.9rem' }}>
                        {(order.agreedPrice || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginBottom: '8px' }}>
                      <div>Số lượng: {order.quantity || 1} suất</div>
                      {order.pickupAddress && <div>Địa chỉ: {order.pickupAddress}</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={isBusy}
                        onClick={() => {
                          playAlertSound()
                          void onDeliverOrder(order.id)
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isBusy ? 'Đang cập nhật…' : 'Đã Xong / Giao Món'}
                      </button>
                      {onContactCustomer && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onContactCustomer(order.marketplacePostId, order.id)}
                          style={{
                            backgroundColor: 'var(--surface-2, #f1f5f9)',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                          title="Nhắn tin với khách"
                        >
                          Chat
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Column 3: Đã Giao & Chờ Escrow Hold */}
        <div
          style={{
            backgroundColor: 'var(--surface-2, #f8fafc)',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <strong style={{ fontSize: '0.9rem', color: '#15803d' }}>
              SẴN SÀNG & ĐÃ GIAO ({readyOrDeliveredOrders.length})
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
              Escrow Hold 24h
            </span>
          </div>

          {readyOrDeliveredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>
              Chưa có đơn đã bàn giao gần đây
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {readyOrDeliveredOrders.slice(0, 5).map((order) => {
                const isCompleted = order.status === MarketplaceOrderStatus.Completed
                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: 'var(--surface-1, #ffffff)',
                      borderRadius: '10px',
                      padding: '12px',
                      border: '1px solid #bbf7d0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{order.postTitle || 'Món ăn'}</strong>
                      <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.9rem' }}>
                        +{(order.sellerNetAmount || order.agreedPrice || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
                      <div>{isCompleted ? 'Khách đã bấm nhận món' : 'Đã bàn giao món'}</div>
                      <div style={{ color: '#0369a1', marginTop: '4px' }}>
                        Tiền về ví sau 24h Escrow bảo vệ an toàn thực phẩm.
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
