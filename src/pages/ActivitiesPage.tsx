import { useCallback, useState } from 'react'
import { getMyActivities, type UserActivity } from '../api'
import { UserActivityType } from '../api/types'
import { HomejiLoader, usePersistentLoad } from '../components/HomejiLoader'
import { formatActivityDisplay } from '../lib/activityDisplay'
import { formatDate, userActivityTypeLabel } from '../lib/labels'

export function ActivitiesPage({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<UserActivity[]>([])
  const [type, setType] = useState<UserActivityType | ''>('')

  const loadFn = useCallback(async () => {
    setItems(
      await getMyActivities({
        type: type === '' ? undefined : type,
        take: 50,
      }),
    )
  }, [type])

  const { showLoader, onIntroComplete, error, disrupted } = usePersistentLoad(loadFn, [type])

  return (
    <div className={embedded ? 'map-embed' : 'container page'}>
      {!embedded ? (
        <>
          <h1 className="page-title">Nhật ký hoạt động</h1>
        </>
      ) : null}

      <div className="form-group">
        <label className="form-label">Lọc loại</label>
        <select
          className="form-select"
          value={type === '' ? '' : String(type)}
          onChange={(e) => setType(e.target.value === '' ? '' : (Number(e.target.value) as UserActivityType))}
        >
          <option value="">Tất cả</option>
          {Object.entries(userActivityTypeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error && !disrupted && <div className="alert alert-error">{error}</div>}

      {showLoader ? (
        <HomejiLoader onIntroComplete={onIntroComplete} message={disrupted ? error : undefined} />
      ) : items.length === 0 ? (
        <div className="empty-state card">Chưa có nhật ký hoạt động.</div>
      ) : (
        <div className="notification-list">
          {items.map((a) => {
            const display = formatActivityDisplay(a)
            return (
              <article key={a.id} className="card notification-item activity-item map-motion-fade-up">
                <div className="activity-item__body">
                  <div className="activity-item__header">
                    <span className="badge badge-gray">{userActivityTypeLabel[a.type] ?? 'Chung'}</span>
                    <small className="activity-item__time">{formatDate(a.occurredAt)}</small>
                  </div>
                  <h3>{display.title}</h3>
                  {display.description ? <p>{display.description}</p> : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
