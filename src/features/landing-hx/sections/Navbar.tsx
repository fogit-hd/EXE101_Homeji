import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { ArrowUpRight, House, Menu, Moon, Sun, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { applyTheme, currentTheme, THEME_EVENT, type Theme } from '../../../lib/theme'
import { IconButton } from '../ui/primitives'

export type NavItem = { label: string; to: string; onSelect?: () => void }

function subscribeTheme(listener: () => void) {
  window.addEventListener(THEME_EVENT, listener)
  return () => window.removeEventListener(THEME_EVENT, listener)
}

function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, (): Theme => 'light')
  return [theme, () => applyTheme(theme === 'dark' ? 'light' : 'dark', true)]
}

export function Logo() {
  return (
    <Link to="/" className="hx-logo" aria-label="Homeji, về trang chủ">
      <span className="hx-logo__mark" aria-hidden="true"><House /></span>
      <span className="hx-logo__word">Homeji</span>
    </Link>
  )
}

/* Links in .hx get `color: inherit` on hover from base.css, so every link here names its hover colour. */
const DESKTOP_LINK = [
  'tw:relative tw:inline-flex tw:min-h-11 tw:items-center tw:px-3.5',
  'tw:text-[15px] tw:font-medium tw:text-ink-muted tw:transition-colors tw:duration-200 tw:ease-hx',
  'tw:hover:text-ink tw:focus-visible:text-ink',
  // A hairline that draws in from the left on hover.
  'tw:after:absolute tw:after:inset-x-3.5 tw:after:bottom-2 tw:after:h-px tw:after:origin-left tw:after:scale-x-0 tw:after:bg-current',
  'tw:after:transition-transform tw:after:duration-300 tw:after:ease-hx tw:hover:after:scale-x-100',
].join(' ')

const SHEET_LINK = [
  'tw:flex tw:min-h-13 tw:items-center tw:rounded-xl tw:px-3.5',
  'tw:text-lg tw:font-semibold tw:text-ink tw:transition-colors tw:duration-200',
  'tw:hover:bg-sunken tw:hover:text-ink',
].join(' ')

const CTA_BASE = [
  'tw:group tw:inline-flex tw:items-center tw:justify-center tw:gap-1.5 tw:whitespace-nowrap tw:rounded-xl',
  // #C2410C here, not #EA580C: the label is under 19px, and white on #EA580C only passes AA for large text.
  'tw:bg-accent tw:font-semibold tw:text-accent-on tw:shadow-[0_1px_2px_rgb(15_23_42/0.12)]',
  'tw:transition-[background-color,transform] tw:duration-200 tw:ease-hx',
  'tw:hover:bg-accent-hover tw:hover:text-accent-on tw:motion-safe:hover:-translate-y-px tw:active:translate-y-0 tw:active:scale-[0.98]',
].join(' ')
// The header copy is secondary: in the first view the hero's "Tìm kiếm" is the one orange action.
const CTA = [
  'tw:group tw:inline-flex tw:min-h-11 tw:items-center tw:justify-center tw:gap-1.5 tw:whitespace-nowrap tw:rounded-xl tw:px-4 tw:sm:px-5',
  'tw:border tw:border-line-strong tw:bg-surface tw:text-sm tw:font-semibold tw:text-ink',
  'tw:transition-[border-color,color,transform] tw:duration-200 tw:ease-hx',
  'tw:hover:border-brand tw:hover:text-brand-text tw:motion-safe:hover:-translate-y-px tw:active:translate-y-0 tw:active:scale-[0.98]',
].join(' ')
const CTA_LARGE = `${CTA_BASE} tw:min-h-14 tw:text-base`

/** Scrolls to an in-page section and moves focus to its heading, as the hero search does. */
function goToSection(hash: string) {
  const target = document.querySelector<HTMLElement>(hash)
  if (!target) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  history.pushState(null, '', hash)
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  const heading = target.querySelector<HTMLElement>('h2')
  if (heading) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
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
          if (onNavigate) {
            event.preventDefault()
            onNavigate(item.to)
          }
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

/** Language switch is presentational for now: the app has no i18n layer yet. */
/** `display` is a prop so callers can swap it (e.g. hidden on mobile) without two display utilities fighting. */
function LanguageSwitch({ display = 'tw:inline-flex' }: { display?: string }) {
  const [lang, setLang] = useState<'vi' | 'en'>('vi')
  return (
    <div className={`${display} tw:items-center tw:rounded-xl tw:border tw:border-line tw:bg-surface tw:p-0.5`} role="group" aria-label="Ngôn ngữ">
      {(['vi', 'en'] as const).map(code => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={[
            'tw:min-h-11 tw:min-w-11 tw:rounded-[10px] tw:border-0 tw:text-xs tw:font-bold tw:tracking-wide tw:transition-colors tw:duration-200',
            lang === code ? 'tw:bg-ink tw:text-surface' : 'tw:bg-transparent tw:text-ink-subtle tw:hover:text-ink',
          ].join(' ')}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export function Navbar({ items }: { items: NavItem[] }) {
  const [theme, toggleTheme] = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDialogElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  // Section a sheet link asked for; consumed once the dialog has closed.
  const pendingHash = useRef<string | null>(null)

  const navigateFromSheet = (to: string) => {
    if (to.startsWith('#')) pendingHash.current = to
    setOpen(false)
  }

  // A sentinel above the bar flips the frosted state; no scroll listener.
  useEffect(() => {
    const node = sentinel.current
    if (!node) return undefined
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // <dialog>.showModal gives the sheet Esc to close and an inert page behind it.
  useEffect(() => {
    const dialog = sheet.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const themeLabel = theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  const themeIcon = theme === 'dark' ? <Sun /> : <Moon />

  return (
    <>
      <div ref={sentinel} className="tw:pointer-events-none tw:absolute tw:top-0 tw:h-2 tw:w-px" aria-hidden="true" />
      <header
        className={[
          'tw:sticky tw:top-0 tw:z-50 tw:border-b tw:transition-[background-color,border-color,box-shadow] tw:duration-500 tw:ease-hx',
          scrolled
            ? 'tw:border-line tw:bg-canvas/80 tw:shadow-[0_1px_0_rgb(15_23_42/0.03)] tw:backdrop-blur-xl tw:backdrop-saturate-150'
            : 'tw:border-transparent tw:bg-canvas',
        ].join(' ')}
      >
        <div className="tw:mx-auto tw:flex tw:h-(--hx-nav-h) tw:max-w-[calc(var(--hx-container)_+_var(--hx-gutter)_*_2)] tw:items-center tw:gap-3 tw:px-(--hx-gutter)">
          <Logo />

          <nav className="tw:mx-auto tw:hidden tw:items-center tw:gap-1 tw:lg:flex" aria-label="Điều hướng chính">
            {items.map(item => <NavLink key={item.label} item={item} className={DESKTOP_LINK} />)}
          </nav>

          <div className="tw:ml-auto tw:flex tw:items-center tw:gap-2 tw:lg:ml-0">
            <LanguageSwitch display="tw:hidden tw:md:inline-flex" />
            <IconButton label={themeLabel} icon={themeIcon} onClick={toggleTheme} className="tw:hidden tw:md:inline-flex" />
            <span className="tw:mx-1 tw:hidden tw:h-6 tw:w-px tw:bg-line-strong tw:lg:block" aria-hidden="true" />
            <Link
              to="/login"
              className="tw:hidden tw:min-h-11 tw:items-center tw:px-3 tw:text-[15px] tw:font-semibold tw:text-ink tw:transition-colors tw:duration-200 tw:hover:text-brand-text tw:lg:inline-flex"
            >
              Đăng nhập
            </Link>
            <Link to="/posts/new" className={CTA}>
              Đăng tin ngay
              <ArrowUpRight
                className="tw:hidden tw:size-4 tw:transition-transform tw:duration-300 tw:ease-hx tw:sm:block tw:motion-safe:group-hover:translate-x-0.5 tw:motion-safe:group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
            <IconButton
              ref={menuButton}
              className="tw:lg:hidden"
              label="Mở menu"
              icon={<Menu />}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="hx-sheet"
              onClick={() => setOpen(true)}
            />
          </div>
        </div>
      </header>

      <dialog
        id="hx-sheet"
        ref={sheet}
        aria-label="Menu"
        className="tw:fixed tw:inset-y-0 tw:right-0 tw:left-auto tw:m-0 tw:h-dvh tw:max-h-dvh tw:w-[min(360px,100vw)] tw:max-w-full tw:border-0 tw:bg-transparent tw:p-0 tw:font-sans tw:text-ink tw:backdrop:bg-slate-950/50 tw:backdrop:backdrop-blur-[2px]"
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
        <div className="tw:flex tw:h-full tw:flex-col tw:gap-6 tw:overflow-y-auto tw:bg-surface tw:px-5 tw:pt-3 tw:pb-[max(24px,env(safe-area-inset-bottom))] tw:shadow-float tw:motion-safe:animate-sheet-in">
          <div className="tw:flex tw:items-center tw:justify-between">
            <Logo />
            <IconButton label="Đóng menu" icon={<X />} onClick={() => setOpen(false)} />
          </div>
          <nav className="tw:grid tw:gap-0.5" aria-label="Điều hướng chính">
            {items.map(item => <NavLink key={item.label} item={item} className={SHEET_LINK} onNavigate={navigateFromSheet} />)}
          </nav>
          <div className="tw:flex tw:items-center tw:justify-between tw:border-t tw:border-line tw:pt-4">
            <LanguageSwitch />
            <IconButton label={themeLabel} icon={themeIcon} variant="outline" onClick={toggleTheme} />
          </div>
          <div className="tw:mt-auto tw:grid tw:gap-3">
            <Link to="/posts/new" className={CTA_LARGE}>Đăng tin ngay</Link>
            <Link
              to="/login"
              className="tw:inline-flex tw:min-h-14 tw:items-center tw:justify-center tw:rounded-xl tw:border tw:border-line-strong tw:text-base tw:font-semibold tw:text-ink tw:transition-colors tw:duration-200 tw:hover:bg-sunken tw:hover:text-ink"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </dialog>
    </>
  )
}
