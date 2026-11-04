import { useEffect, useState } from 'react'
import { getAdminMembers, getAdminRegisteredAccounts, type AdminMember, type AdminRegisteredAccount } from '../../api/adminReporting'
import { formatDate, formatPrice, paymentMethodLabel, paymentStatusLabel, userRoleLabel } from '../../lib/labels'
import { getErrorMessage } from '../../lib/errors'
import './AdminReporting.css'

const memberStateLabel: Record<string, string> = { active: 'Đang có hiệu lực', expired: 'Đã hết hạn', scheduled: 'Chưa bắt đầu', cancelled: 'Đã hủy' }

export function AdminRegistrationsPanel() {
  const [view, setView] = useState<'accounts' | 'members'>('accounts')
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [state, setState] = useState('all')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; accounts?: AdminRegisteredAccount[]; members?: AdminMember[]; total: number }>({ key: '', total: 0 })
  const [error, setError] = useState<{ key: string; message: string }>({ key: '', message: '' })
  const key = `${view}|${query}|${state}|${page}|${attempt}`
  const loading = result.key !== key && error.key !== key
  useEffect(() => {
    let active = true
    const request = view === 'accounts' ? getAdminRegisteredAccounts(query, page) : getAdminMembers(query, state, page)
    void request.then(data => {
      if (active) setResult({ key, total: data.totalCount, ...(view === 'accounts' ? { accounts: data.items as AdminRegisteredAccount[] } : { members: data.items as AdminMember[] }) })
    }).catch(reason => { if (active) setError({ key, message: getErrorMessage(reason, 'Chưa tải được danh sách đăng ký.') }) })
    return () => { active = false }
  }, [view, query, state, page, key])
  const shown = result.key === key
  return <section className="admin-register" aria-label="Danh sách đăng ký">
    <div className="admin-register__switch" role="group" aria-label="Loại đăng ký">
      <button type="button" aria-pressed={view === 'accounts'} onClick={() => { setView('accounts'); setPage(1) }}>Tài khoản đăng ký</button>
      <button type="button" aria-pressed={view === 'members'} onClick={() => { setView('members'); setPage(1) }}>Gói thành viên</button>
    </div>
    <form className="admin-report-tools" onSubmit={event => { event.preventDefault(); setQuery(keyword.trim()); setPage(1); setAttempt(value => value + 1) }}>
      <label>Tìm đăng ký<input className="form-input" type="search" value={keyword} maxLength={100} onChange={event => setKeyword(event.target.value)} placeholder="Tên hoặc email…" /></label>
      {view === 'members' ? <label>Trạng thái gói<select className="form-select" value={state} onChange={event => { setState(event.target.value); setPage(1) }}><option value="all">Tất cả trạng thái</option>{Object.entries(memberStateLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
      <button type="submit" className="btn btn-secondary">Tìm kiếm</button>
      <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => setAttempt(value => value + 1)}>Làm mới danh sách</button>
    </form>
    <p className="admin-report-note">{view === 'accounts' ? 'Bao gồm tài khoản chưa hoàn tất hồ sơ. Tài khoản mới nhất hiển thị trước.' : 'Mỗi dòng là một lượt đăng ký hoặc gia hạn. Trạng thái gói và thanh toán được hiển thị riêng.'}</p>
    {loading ? <p role="status">Đang tải danh sách…</p> : error.key === key ? <div role="alert">{error.message} <button type="button" className="btn btn-secondary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div> : null}
    {shown ? <>
      <div className="admin-register__count">{result.total.toLocaleString('vi-VN')} {view === 'accounts' ? 'tài khoản' : 'lượt đăng ký gói'}</div>
      {!result.total ? <p className="empty-state">Chưa có đăng ký phù hợp.</p> : <div className="admin-data-table" tabIndex={0} role="region" aria-label={view === 'accounts' ? 'Bảng tài khoản' : 'Bảng gói Premium'}><table>
        <thead><tr><th>Người đăng ký</th>{view === 'accounts' ? <><th>Tài khoản</th><th>Ngày đăng ký</th><th>Gói hiện tại</th></> : <><th>Gói</th><th>Thời hạn</th><th>Thanh toán</th></>}</tr></thead>
        <tbody>{view === 'accounts' ? result.accounts?.map(account => <tr key={account.userId}>
          <td><strong>{account.displayName}</strong><small>{account.email || 'Chưa có email'}</small><details><summary>Mã tài khoản</summary><small>{account.userId}</small></details></td>
          <td>{account.role ? userRoleLabel[account.role] ?? 'Chưa cập nhật' : 'Chưa có hồ sơ'}<small>{account.emailConfirmed ? 'Email đã xác nhận' : 'Email chưa xác nhận'}</small><small>{account.profileCompleted ? 'Hồ sơ đã hoàn tất' : 'Hồ sơ chưa hoàn tất'}</small></td>
          <td>{formatDate(account.registeredAt)}</td><td><span className={`admin-state ${account.isPremium ? 'is-active' : ''}`}>{account.isPremium ? 'Premium' : 'Miễn phí'}</span>{account.premiumExpiresAt ? <small>Đến {formatDate(account.premiumExpiresAt)}</small> : null}</td>
        </tr>) : result.members?.map(member => <tr key={member.id}>
          <td><strong>{member.displayName}</strong><small>{member.email || 'Chưa có email'}</small><small>Đăng ký {formatDate(member.registeredAt)}</small></td>
          <td><strong>{member.packageName}</strong><span className={`admin-state ${member.state === 'active' ? 'is-active' : ''}`}>{memberStateLabel[member.state] ?? 'Chưa rõ'}</span></td>
          <td>{formatDate(member.startedAt)}<small>đến {formatDate(member.expiresAt)}</small></td>
          <td>{member.amount === null ? 'Không có giao dịch' : formatPrice(member.amount)}<small>{member.paymentId ? member.paymentStatus ? paymentStatusLabel[member.paymentStatus] ?? 'Chưa rõ trạng thái' : 'Chưa rõ trạng thái' : 'Gói được cấp trực tiếp'}</small>{member.paymentMethod ? <small>{paymentMethodLabel[member.paymentMethod] ?? 'Chưa rõ phương thức'}</small> : null}</td>
        </tr>)}</tbody>
      </table></div>}
      <div className="admin-report-pagination"><button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page} / {Math.max(1, Math.ceil(result.total / 25))}</span><button className="btn btn-secondary" type="button" disabled={page * 25 >= result.total} onClick={() => setPage(value => value + 1)}>Trang sau</button></div>
    </> : null}
  </section>
}
