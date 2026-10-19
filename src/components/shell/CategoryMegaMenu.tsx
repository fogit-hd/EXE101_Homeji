import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  isNavigationItemActive,
  navigationGroups,
  type NavGroupId,
} from './navigation'
import { ShellIcon } from './ShellIcons'

type Props = {
  open: boolean
  drawer: boolean
  menuId: string
  onNavigate: () => void
}

export function CategoryMegaMenu({ open, drawer, menuId, onNavigate }: Props) {
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const [expanded, setExpanded] = useState<Record<NavGroupId, boolean>>({
    housing: true,
    community: true,
    market: true,
    account: true,
  })

  useEffect(() => {
    if (!open) return
    const root = panelRef.current
    if (!root) return
    const links = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
    const onKey = (event: KeyboardEvent) => {
      const nodes = links()
      if (nodes.length === 0) return
      const index = nodes.indexOf(document.activeElement as HTMLAnchorElement)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        nodes[index < 0 ? 0 : Math.min(nodes.length - 1, index + 1)]?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        nodes[index <= 0 ? 0 : index - 1]?.focus()
      } else if (event.key === 'Home') {
        event.preventDefault()
        nodes[0]?.focus()
      } else if (event.key === 'End') {
        event.preventDefault()
        nodes[nodes.length - 1]?.focus()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [open, expanded])

  useEffect(() => {
    if (!open || !drawer) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, drawer])

  if (!open) return null

  return (
    <div
      id={menuId}
      ref={panelRef}
      className={`hj-mega${drawer ? ' hj-mega--drawer' : ''}`}
      role="navigation"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="hj-mega__title">
        Danh mục Homeji
      </p>
      <div className="hj-mega__groups">
        {navigationGroups.map((group) => {
          const isOpen = !drawer || expanded[group.id]
          return (
            <section key={group.id} className="hj-mega__group">
              {drawer ? (
                <button
                  type="button"
                  className="hj-mega__group-toggle"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [group.id]: !current[group.id] }))
                  }
                >
                  <span>{group.label}</span>
                  <span aria-hidden>{isOpen ? '−' : '+'}</span>
                </button>
              ) : (
                <h2 className="hj-mega__group-label">{group.label}</h2>
              )}
              {isOpen ? (
                <ul className="hj-mega__list">
                  {group.items.map((item, index) => {
                    const active = isNavigationItemActive(item, location.pathname, location.search)
                    const showCluster = Boolean(item.cluster) && item.cluster !== group.items[index - 1]?.cluster
                    return (
                      <li key={item.id}>
                        {showCluster ? <p className="hj-mega__cluster">{item.cluster}</p> : null}
                        <Link
                          to={item.href}
                          className={`hj-mega__link${active ? ' is-active' : ''}`}
                          aria-current={active ? 'page' : undefined}
                          onClick={onNavigate}
                        >
                          <span className="hj-mega__icon">
                            <ShellIcon name={item.icon} />
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
