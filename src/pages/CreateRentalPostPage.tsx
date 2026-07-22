import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createRentalPostDraft } from '../api'
import { RentalPostType, UserRole } from '../api/types'
import { useAuth } from '../contexts/AuthContext'
import { rentalPostTypeLabel } from '../lib/labels'
import { getErrorMessage } from '../lib/errors'

function typeFromQuery(raw: string | null): RentalPostType {
  if (raw === 'roommate' || raw === String(RentalPostType.RoommateShare)) {
    return RentalPostType.RoommateShare
  }
  if (raw === 'transfer' || raw === 'pass' || raw === String(RentalPostType.RoomTransfer)) {
    return RentalPostType.RoomTransfer
  }
  return RentalPostType.VacantRoom
}

export function CreateRentalPostPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const initialType = useMemo(
    () => typeFromQuery(searchParams.get('type')),
    [searchParams],
  )
  const [type, setType] = useState<RentalPostType>(initialType)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const availableTypes = useMemo<RentalPostType[]>(
    () => profile?.role === UserRole.Renter
      ? [RentalPostType.RoomTransfer]
      : [RentalPostType.VacantRoom, RentalPostType.RoommateShare],
    [profile?.role],
  )
  const selectedType = availableTypes.includes(type) ? type : availableTypes[0]

  const handleCreate = async () => {
    setError('')
    setLoading(true)
    try {
      const post = await createRentalPostDraft(selectedType)
      navigate(`/posts/${post.id}/edit`)
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tạo tin nháp'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page">
      <h1 className="page-title">Đăng tin mới</h1>
      <p className="page-subtitle">Chọn loại tin đăng để bắt đầu</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="type-selector">
        {availableTypes.map((t) => (
          <button
            key={t}
            type="button"
            className={`type-card card ${selectedType === t ? 'selected' : ''}`}
            onClick={() => setType(t)}
          >
            <h3>{rentalPostTypeLabel[t]}</h3>
            {t === RentalPostType.RoomTransfer ? (
              <p>Chuyển hợp đồng hoặc cho thuê lại có xác nhận của chủ nhà</p>
            ) : (
            <p>
              {t === RentalPostType.VacantRoom
                ? 'Cho thuê phòng trống'
                : 'Tìm bạn ở ghép cùng phòng'}
            </p>
            )}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void handleCreate()}>
        {loading ? 'Đang tạo...' : 'Tiếp tục'}
      </button>
    </div>
  )
}
