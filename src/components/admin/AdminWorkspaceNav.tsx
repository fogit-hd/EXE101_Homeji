import { useId, useRef, useState } from 'react'

export type AdminSection = 'pricing' | 'overview' | 'registrations' | 'exports' | 'posts' | 'reports' | 'verifications' | 'withdrawals' | 'active' | 'maintenance' | 'aiReviews'

const sections: { id: AdminSection; label: string; group: string }[] = [
  { id: 'overview', label: 'Tổng quan', group: 'Điều hành' },
  { id: 'registrations', label: 'Tài khoản & thành viên', group: 'Điều hành' },
  { id: 'pricing', label: 'Giá gói thành viên', group: 'Điều hành' },
  { id: 'exports', label: 'Báo cáo Excel', group: 'Điều hành' },
  { id: 'posts', label: 'Tin chờ duyệt', group: 'Nội dung & giao dịch' },
  { id: 'aiReviews', label: 'AI kiểm tra tin', group: 'Nội dung & giao dịch' },
  { id: 'reports', label: 'Báo cáo vi phạm', group: 'Nội dung & giao dịch' },
  { id: 'verifications', label: 'Xác minh chủ nhà', group: 'Nội dung & giao dịch' },
  { id: 'withdrawals', label: 'Rút tiền', group: 'Nội dung & giao dịch' },
  { id: 'active', label: 'Đang hoạt động', group: 'Hệ thống' },
  { id: 'maintenance', label: 'Bảo trì', group: 'Hệ thống' },
]

export function AdminWorkspaceNav({ selected, counts, onSelect }: {
  selected: AdminSection
  counts: Partial<Record<AdminSection, number>>
  onSelect: (section: AdminSection) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  return <nav className="admin-nav" aria-label="Mục quản trị">
    <span className="admin-nav__heading">Không gian quản trị</span>
    <button ref={toggleRef} type="button" className="admin-nav__toggle" aria-expanded={expanded} aria-controls={menuId} onClick={() => setExpanded(value => !value)}>
      <span><small>Mục quản trị</small>{sections.find(section => section.id === selected)?.label}</span><span>{expanded ? 'Đóng' : 'Chọn mục'}</span>
    </button>
    <ul id={menuId} className={expanded ? 'is-expanded' : ''}>{sections.map((section, index) => <li key={section.id}>
      {index === 0 || section.group !== sections[index - 1].group ? <span className="admin-nav__group">{section.group}</span> : null}
      <button type="button" aria-current={selected === section.id ? 'page' : undefined}
        onClick={() => {
          onSelect(section.id)
          if (toggleRef.current?.offsetParent !== null) toggleRef.current?.focus()
          setExpanded(false)
        }}>
        <span>{section.label}</span>
        {counts[section.id] !== undefined ? <span className="admin-nav__count">{counts[section.id]?.toLocaleString('vi-VN')}</span> : null}
      </button>
    </li>)}</ul>
  </nav>
}

