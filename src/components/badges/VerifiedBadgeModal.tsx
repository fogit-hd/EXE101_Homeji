import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IdCardCheckIcon, CameraCheckIcon, NoHiddenFeeIcon, ShieldCheckIcon } from '../icons/SvgIcons'
import './VerifiedBadgeModal.css'

export interface VerifiedBadgeModalProps {
  open: boolean
  onClose: () => void
}

export function VerifiedBadgeModal({ open, onClose }: VerifiedBadgeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="verified-modal__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="verified-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verified-modal-title"
      >
        <header className="verified-modal__header">
          <div className="verified-modal__badge-icon">
            <ShieldCheckIcon size={28} />
          </div>
          <div>
            <h3 id="verified-modal-title">Tiêu chuẩn Xác minh Homeji</h3>
            <p>Quy trình kiểm duyệt minh bạch bảo vệ người thuê phòng</p>
          </div>
          <button
            type="button"
            className="verified-modal__close-btn"
            onClick={onClose}
            aria-label="Đóng bảng giải thích"
          >
            ×
          </button>
        </header>

        <div className="verified-modal__body">
          <p className="verified-modal__intro">
            Tin đăng có huy hiệu <strong>Chủ nhà đã xác minh</strong> cam kết đạt 3 tiêu chuẩn cốt lõi của Homeji:
          </p>

          <div className="verified-modal__pillar">
            <div className="verified-modal__pillar-icon is-emerald">
              <IdCardCheckIcon size={24} />
            </div>
            <div className="verified-modal__pillar-content">
              <h4>1. Đối chiếu danh tính & CCCD gắn chip</h4>
              <p>
                Xác thực chủ nhà qua căn cước công dân và hợp đồng ủy quyền quản lý nhà trọ hợp pháp. Ngăn chặn 100% tình trạng lừa cọc hay mạo danh chủ phòng.
              </p>
            </div>
          </div>

          <div className="verified-modal__pillar">
            <div className="verified-modal__pillar-icon is-teal">
              <CameraCheckIcon size={24} />
            </div>
            <div className="verified-modal__pillar-content">
              <h4>2. Hình ảnh thực tế — Không chỉnh sửa ảo</h4>
              <p>
                Toàn bộ ảnh chụp là không gian thật, đối chiếu thực tế hoặc qua video kiểm duyệt. Tuyệt đối không sử dụng ảnh render 3D làm sai lệch diện tích căn phòng.
              </p>
            </div>
          </div>

          <div className="verified-modal__pillar">
            <div className="verified-modal__pillar-icon is-amber">
              <NoHiddenFeeIcon size={24} />
            </div>
            <div className="verified-modal__pillar-content">
              <h4>3. Giá cam kết minh bạch — Không phí ẩn</h4>
              <p>
                Công khai rõ ràng tiền phòng, tiền cọc, biểu phí điện, nước, internet, gửi xe và dịch vụ. Cam kết đúng giá niêm yết, không phát sinh chi phí bất thường.
              </p>
            </div>
          </div>
        </div>

        <footer className="verified-modal__footer">
          <button type="button" className="verified-modal__btn-primary" onClick={onClose}>
            Đã hiểu tiêu chuẩn
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
