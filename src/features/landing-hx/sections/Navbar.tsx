import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeSwitch } from '../../../components/theme/ThemeSwitch'
import { LANDING_GLASS } from '../ui/glass'
import { BrandMark } from '../ui/BrandMark'
import { IconButton } from '../ui/primitives'
import { jumpToSection } from '../jump'

/** A picture card in a nav word's panel (nav-cards). */
export type NavCard = { id: string; title: string; meta: string; image: { src: string; alt: string }; onSelect: () => void }
export type NavItem = { label: string; to: string; onSelect?: () => void; cards?: NavCard[] }

export function Logo() {
  return (
    <Link to="/" className="hx-logo" aria-label="Homeji, về trang chủ">
      <BrandMark className="hx-logo__mark" />
      <span className="hx-logo__word">Homeji</span>
    </Link>
  )
}

/** Jumps to an in-page section and moves focus to its heading, as the hero search does. */
function goToSection(hash: string) {
  const target = document.querySelector<HTMLElement>(hash)
  if (target) jumpToSection(target, hash)
}

function NavLink({ item, className, onNavigate }: { item: NavItem; className: string; onNavigate?: (to: string) => void }) {
  if (item.to.startsWith('#')) {
    return (
      <a
        className={className}
        href={item.to}
        onClick={event => {
          item.onSelect?.()
          // Inside the sheet the jump waits until the modal has closed (see Navbar onClose):
          // a native jump while the dialog is open lands short once focus returns to the menu button.
          event.preventDefault()
          if (onNavigate) onNavigate(item.to)
          else goToSection(item.to)
        }}
      >
        {item.label}
      </a>
    )
  }
  return (
    <Link className={className} to={item.to} onClick={() => { item.onSelect?.(); onNavigate?.(item.to) }}>
      {item.label}
    </Link>
  )
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Keeps Tab / Shift+Tab cycling inside the open sheet instead of escaping to the browser UI. */
function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(item => item.offsetParent !== null)
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/** The full-width panel under the bar: three or four picture cards for one nav word. */
function CardsPanel({ item, open, onPick, onEnter, onLeave }: {
  item: NavItem
  open: boolean
  onPick: () => void
  onEnter: () => void
  onLeave: () => void
}) {
  return (
    <div
      id="hx-nav-panel"
      className={`hx-nav__panel${open ? ' is-open' : ''}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      // Closed, the panel is out of the Tab order and the accessibility tree.
      inert={!open}
    >
      <ul className="hx-nav__cards">
        {item.cards!.map(card => (
          <li key={card.id}>
            <a
              className="hx-nav__card"
              href={item.to}
              onClick={event => {
                event.preventDefault()
                card.onSelect()
                onPick()
                goToSection(item.to)
              }}
            >
              <span className="hx-nav__card-media">
                <img src={card.image.src} alt={card.image.alt} loading="lazy" decoding="async" />
              </span>
              <span className="hx-nav__card-title">{card.title}</span>
              <span className="hx-nav__card-meta">{card.meta}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Navbar({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState(false)
  const sheet = useRef<HTMLDialogElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const hoverTimer = useRef(0)
  // Section a sheet link asked for; consumed once the dialog has closed.
  const pendingHash = useRef<string | null>(null)
  const panelItem = items.find(item => item.cards?.length)

  const navigateFromSheet = (to: string) => {
    if (to.startsWith('#')) pendingHash.current = to
    setOpen(false)
  }

  // The panel opens after a short hover, so a pointer passing over the bar does not flash it.
  const openPanelSoon = () => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setPanel(true), 150)
  }
  const closePanelSoon = () => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setPanel(false), 120)
  }
  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

  // The bar slides away while the reader scrolls down and comes back on any scroll up.
  const [tucked, setTucked] = useState(false)
  const tuckedRef = useRef(false)
  useEffect(() => {
    let last = window.scrollY
    let y = last
    let frame = 0
    const onScroll = () => {
      // Read the position here, in the event: read inside the frame, after the film has written
      // its styles, it would make the browser recalculate them on the spot.
      y = window.scrollY
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const delta = y - last
        if (Math.abs(delta) < 6) return
        last = y
        const down = delta > 0 && y > 120
        if (down === tuckedRef.current) return
        tuckedRef.current = down
        setTucked(down)
        if (down) setPanel(false)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  const hidden = tucked && !open && !panel

  // <dialog>.showModal gives the sheet Esc to close and an inert page behind it.
  useEffect(() => {
    const dialog = sheet.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])


  return (
    <>
      <header
        className="hx-nav"
        data-tucked={hidden || undefined}
        // Keyboard focus inside the bar always brings it back.
        onFocus={() => {
          tuckedRef.current = false
          setTucked(false)
        }}
        onKeyDown={event => { if (event.key === 'Escape') setPanel(false) }}
        onMouseLeave={closePanelSoon}
      >
        <div className="hx-nav__bar">
          <Logo />

          <nav className="hx-nav__words" aria-label="Điều hướng chính">
            {items.map(item =>
              item === panelItem ? (
                <span key={item.label} className="hx-nav__has-panel" onMouseEnter={openPanelSoon} onMouseLeave={closePanelSoon}>
                  <NavLink item={item} className="hx-nav__word" />
                  <button
                    type="button"
                    className="hx-nav__panel-toggle"
                    aria-label={`Xem nhanh: ${item.label}`}
                    aria-expanded={panel}
                    aria-controls="hx-nav-panel"
                    onClick={() => setPanel(value => !value)}
                  >
                    <ChevronDown aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <NavLink key={item.label} item={item} className="hx-nav__word" />
              ),
            )}
          </nav>

          <div className="hx-nav__end">
            {/* The app's own theme switch, in the landing's colours. */}
            <span className="hx-nav__theme hx-nav__wide"><ThemeSwitch palette={LANDING_GLASS} /></span>
            <Link to="/login" className="hx-nav__signin">Đăng nhập</Link>
            <a
              href="#tin-noi-bat"
              className="hx-nav__cta"
              onClick={event => {
                event.preventDefault()
                goToSection('#tin-noi-bat')
              }}
            >
              Tìm phòng
              <ArrowRight aria-hidden="true" />
            </a>
            <IconButton
              ref={menuButton}
              className="hx-nav__menu"
              label="Mở menu"
              icon={<Menu />}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="hx-sheet"
              onClick={() => setOpen(true)}
            />
          </div>
        </div>
        {panelItem ? (
          <CardsPanel item={panelItem} open={panel} onPick={() => setPanel(false)} onEnter={openPanelSoon} onLeave={closePanelSoon} />
        ) : null}
      </header>

      <dialog
        id="hx-sheet"
        ref={sheet}
        aria-label="Menu"
        className="hx-sheet"
        onClose={() => {
          setOpen(false)
          const hash = pendingHash.current
          pendingHash.current = null
          // Leaving for a section: focus follows the reader there. Otherwise it returns to the menu button.
          if (hash) goToSection(hash)
          else menuButton.current?.focus()
        }}
        onClick={event => { if (event.target === sheet.current) setOpen(false) }}
        onKeyDown={trapFocus}
      >
        <div className="hx-sheet__body">
          <div className="hx-sheet__head">
            <Logo />
            <IconButton label="Đóng menu" icon={<X />} onClick={() => setOpen(false)} />
          </div>
          <nav className="hx-sheet__words" aria-label="Điều hướng chính">
            {items.map(item => <NavLink key={item.label} item={item} className="hx-sheet__word" onNavigate={navigateFromSheet} />)}
          </nav>
          <div className="hx-sheet__row">
            <span className="hx-sheet__label">Giao diện tối</span>
            <ThemeSwitch palette={LANDING_GLASS} />
          </div>
          <div className="hx-sheet__actions">
            <a
              href="#tin-noi-bat"
              className="hx-nav__cta hx-nav__cta--lg"
              onClick={event => {
                event.preventDefault()
                navigateFromSheet('#tin-noi-bat')
              }}
            >
              Tìm phòng<ArrowRight aria-hidden="true" />
            </a>
            <Link to="/login" className="hx-sheet__signin">Đăng nhập</Link>
          </div>
        </div>
      </dialog>
    </>
  )
}
