import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createRentalPostDraft } from '../api'
import { RentalPostType } from '../api/types'
import { rentalPostTypeLabel } from '../lib/labels'
import { getErrorMessage } from '../lib/errors'

function typeFromQuery(raw: string | null): RentalPostType {
  if (raw === 'roommate' || raw === String(RentalPostType.RoommateShare)) {
    return RentalPostType.RoommateShare
  }
  return RentalPostType.VacantRoom
}

export function CreateRentalPostPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialType = useMemo(
    () => typeFromQuery(searchParams.get('type')),
    [searchParams],
  )
  const [type, setType] = useState<RentalPostType>(initialType)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setType(initialType)
  }, [initialType])

  const handleCreate = async () => {
    setError('')
    setLoading(true)
    try {
      const post = await createRentalPostDraft(type)
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
        {[RentalPostType.VacantRoom, RentalPostType.RoommateShare].map((t) => (
          <button
            key={t}
            type="button"
            className={`type-card card ${type === t ? 'selected' : ''}`}
            onClick={() => setType(t)}
          >
            <h3>{rentalPostTypeLabel[t]}</h3>
            <p>
              {t === RentalPostType.VacantRoom
                ? 'Cho thuê phòng trống'
                : 'Tìm bạn ở ghép cùng phòng'}
            </p>
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void handleCreate()}>
        {loading ? 'Đang tạo...' : 'Tiếp tục'}
      </button>
    </div>
  )
}
