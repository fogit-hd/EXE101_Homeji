import { useId, useRef, useState } from 'react'

type AdminSection = 'overview' | 'posts' | 'reports' | 'verifications' | 'withdrawals' | 'active' | 'maintenance'

const sections: { id: AdminSection; label: string; symbol: string }[] = [
  { id: 'overview', label: 'Tổng quan', symbol: '▦' },
  { id: 'posts', label: 'Tin chờ duyệt', symbol: '▤' },
  { id: 'reports', label: 'Báo cáo', symbol: '⚑' },
  { id: 'verifications', label: 'Xác minh chủ nhà', symbol: '◇' },
  { id: 'withdrawals', label: 'Rút tiền', symbol: '↗' },
  { id: 'active', label: 'Đang hoạt động', symbol: '◉' },
  { id: 'maintenance', label: 'Bảo trì', symbol: '⚙' },
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
      <span><small>Mục quản trị</small>{sections.find(section => section.id === selected)?.label}</span><span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
    </button>
    <ul id={menuId} className={expanded ? 'is-expanded' : ''}>{sections.map(section => <li key={section.id}>
      <button type="button" aria-current={selected === section.id ? 'page' : undefined}
        onClick={() => {
          onSelect(section.id)
          if (toggleRef.current?.offsetParent !== null) toggleRef.current?.focus()
          setExpanded(false)
        }}>
        <span className="admin-nav__icon" aria-hidden="true">{section.symbol}</span>
        <span>{section.label}</span>
        {counts[section.id] !== undefined ? <span className="admin-nav__count">{counts[section.id]?.toLocaleString('vi-VN')}</span> : null}
      </button>
    </li>)}</ul>
  </nav>
}

