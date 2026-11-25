import { useEffect, useRef, useState } from 'react'
import { downloadAdminRegistrations, getAdminMembers, getAdminRegisteredAccounts, type AdminMember, type AdminRegisteredAccount, type AdminRegistrationContact, type AdminRegistrationView } from '../../api/adminReporting'
import { PaymentStatus } from '../../api/types'
import { formatDate, formatPrice, paymentMethodLabel, paymentStatusLabel, userRoleLabel } from '../../lib/labels'
import { getErrorMessage } from '../../lib/errors'
import './AdminReporting.css'

const memberStateLabel: Record<string, string> = { active: 'Đang có hiệu lực', expired: 'Đã hết hạn', scheduled: 'Đã lên lịch', cancelled: 'Đã hủy' }

function membershipPaymentLabel({ paymentId, paymentStatus }: AdminMember) {
  if (!paymentId) return 'Gói được cấp trực tiếp'
  if (paymentStatus === PaymentStatus.Completed) return 'Đã thanh toán'
  return (paymentStatus && paymentStatusLabel[paymentStatus]) ?? 'Chưa rõ trạng thái'
}

function RegistrationContact({ email, phone, contactAddress }: Pick<AdminRegistrationContact, 'email' | 'phone' | 'contactAddress'>) {
  return <td className="admin-register__contact">
    <span>{email || 'Chờ bổ sung email'}</span>
    <small>{phone ? `SĐT ${phone}` : 'Chưa có số điện thoại'}</small>
    <small>{contactAddress || 'Chưa có địa chỉ liên hệ'}</small>
  </td>
}

export function AdminRegistrationsPanel() {
  const [view, setView] = useState<AdminRegistrationView>('accounts')
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [state, setState] = useState('all')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; accounts?: AdminRegisteredAccount[]; members?: AdminMember[]; total: number }>({ key: '', total: 0 })
  const [error, setError] = useState<{ key: string; message: string }>({ key: '', message: '' })
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<{ key: string; message: string }>({ key: '', message: '' })
  const exportPending = useRef(false)
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

  const exportExcel = async (button: HTMLButtonElement) => {
    if (exportPending.current) return
    exportPending.current = true
    setExporting(true)
    setExportError({ key: '', message: '' })
    try {
      const blob = await downloadAdminRegistrations(view, query, state)
      if (!button.isConnected) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = view === 'accounts' ? 'Homeji-tai-khoan.xlsx' : 'Homeji-goi-thanh-vien.xlsx'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (reason) {
      if (button.isConnected) setExportError({ key, message: getErrorMessage(reason, 'Chưa tải được file Excel. Vui lòng thử lại.') })
    } finally {
      exportPending.current = false
      if (button.isConnected) setExporting(false)
    }
  }

  return <section className="admin-register" aria-label="Danh sách đăng ký">
    <div className="admin-register__switch" role="group" aria-label="Loại đăng ký">
      <button type="button" aria-pressed={view === 'accounts'} onClick={() => { setView('accounts'); setPage(1) }}>Tài khoản đăng ký</button>
      <button type="button" aria-pressed={view === 'members'} onClick={() => { setView('members'); setPage(1) }}>Gói thành viên</button>
    </div>
    <form className="admin-report-tools" onSubmit={event => { event.preventDefault(); setQuery(keyword.trim()); setPage(1); setAttempt(value => value + 1) }}>
      <label>Tìm đăng ký<input className="form-input" type="search" value={keyword} maxLength={100} onChange={event => setKeyword(event.target.value)} placeholder={view === 'accounts' ? 'Tên, email, SĐT hoặc địa chỉ' : 'Tên, liên hệ hoặc tên gói'} /></label>
      {view === 'members' ? <label>Trạng thái gói<select className="form-select" value={state} onChange={event => { setState(event.target.value); setPage(1) }}><option value="all">Tất cả trạng thái</option>{Object.entries(memberStateLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
      <button type="submit" className="btn btn-secondary">Tìm kiếm</button>
      <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => setAttempt(value => value + 1)}>Làm mới danh sách</button>
      <button type="button" className="btn btn-primary" disabled={exporting || !shown || !result.total} onClick={event => void exportExcel(event.currentTarget)}>{exporting ? 'Đang tải Excel…' : 'Tải Excel'}</button>
    </form>
    <p className="admin-report-note">{view === 'accounts' ? 'Danh sách gồm cả tài khoản chưa tạo hồ sơ và chủ tin nhập từ nguồn.' : 'Mỗi dòng là một lượt đăng ký hoặc gia hạn.'} File Excel gồm toàn bộ kết quả theo bộ lọc đã áp dụng.</p>
    {exportError.key === key ? <p role="alert">{exportError.message}</p> : null}
    {loading ? <p role="status">Đang tải danh sách…</p> : error.key === key ? <div role="alert">{error.message} <button type="button" className="btn btn-secondary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div> : null}
    {shown ? <>
      <div className="admin-register__count">{result.total.toLocaleString('vi-VN')} {view === 'accounts' ? 'tài khoản' : 'lượt đăng ký gói'}</div>
      {!result.total ? <p className="empty-state">Chưa có đăng ký phù hợp.</p> : <div className="admin-data-table" tabIndex={0} role="region" aria-label={view === 'accounts' ? 'Bảng tài khoản' : 'Bảng gói Premium'}><table>
        <thead><tr><th scope="col">Người đăng ký</th><th scope="col">Liên hệ</th>{view === 'accounts' ? <><th scope="col">Tài khoản</th><th scope="col">Ngày đăng ký</th><th scope="col">Gói hiện tại</th></> : <><th scope="col">Gói</th><th scope="col">Thời hạn</th><th scope="col">Thanh toán</th></>}</tr></thead>
        <tbody>{view === 'accounts' ? result.accounts?.map(account => <tr key={account.userId}>
          <td><strong>{account.displayName}</strong>{account.isImportedPublisher ? <small>Chủ tin nhập từ nguồn</small> : null}<details><summary>Mã tài khoản</summary><small>{account.userId}</small></details></td>
          <RegistrationContact email={account.email} phone={account.phone} contactAddress={account.contactAddress} />
          <td>
            <strong>{account.role === null ? 'Chưa tạo hồ sơ cơ bản' : 'Đã tạo hồ sơ cơ bản'}</strong>
            {account.role !== null ? <small>{userRoleLabel[account.role] ?? 'Chưa cập nhật vai trò'}</small> : null}
            <small>{account.profileCompleted ? 'Đã lưu nhu cầu ở ghép' : 'Chưa lưu nhu cầu ở ghép'}</small>
            {account.email ? <small>{account.emailConfirmed ? 'Email đã xác nhận' : 'Email chưa xác nhận'}</small> : null}
          </td>
          <td>{formatDate(account.registeredAt)}</td><td><span className={`admin-state ${account.isPremium ? 'is-active' : ''}`}>{account.isPremium ? 'Premium' : 'Miễn phí'}</span>{account.premiumExpiresAt ? <small>Đến {formatDate(account.premiumExpiresAt)}</small> : null}</td>
        </tr>) : result.members?.map(member => <tr key={member.id}>
          <td><strong>{member.displayName}</strong>{member.isImportedPublisher ? <small>Chủ tin nhập từ nguồn</small> : null}<small>Đăng ký {formatDate(member.registeredAt)}</small></td>
          <RegistrationContact email={member.email} phone={member.phone} contactAddress={member.contactAddress} />
          <td>
            <strong>{member.packageName}</strong>
            <span className={`admin-state ${member.state === 'active' ? 'is-active' : ''}`}>{memberStateLabel[member.state] ?? 'Chưa rõ'}</span>
            {member.state === 'scheduled' && member.paymentStatus === PaymentStatus.Completed ? <small>Nối tiếp thời hạn Premium trước đó</small> : null}
          </td>
          <td>
            Hiệu lực từ <time dateTime={member.startedAt}>{formatDate(member.startedAt)}</time>
            <small>Đến <time dateTime={member.expiresAt}>{formatDate(member.expiresAt)}</time></small>
          </td>
          <td>
            {member.amount === null ? 'Không có giao dịch' : formatPrice(member.amount)}
            <small>{membershipPaymentLabel(member)}</small>
            {member.paymentMethod ? <small>{paymentMethodLabel[member.paymentMethod] ?? 'Chưa rõ phương thức'}</small> : null}
          </td>
        </tr>)}</tbody>
      </table></div>}
      <div className="admin-report-pagination"><button className="btn btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</button><span>Trang {page} / {Math.max(1, Math.ceil(result.total / 25))}</span><button className="btn btn-secondary" type="button" disabled={page * 25 >= result.total} onClick={() => setPage(value => value + 1)}>Trang sau</button></div>
    </> : null}
  </section>
}
