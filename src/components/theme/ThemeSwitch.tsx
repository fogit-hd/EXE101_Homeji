import { useTheme } from '../../contexts/ThemeContext'
export function ThemeSwitch({ floating = false }: { floating?: boolean }) {
  const { theme, busy, toggle } = useTheme()
  return <button type="button" role="switch" aria-label="Chế độ tối" aria-checked={theme === 'dark'}
    aria-disabled={busy || undefined} aria-busy={busy || undefined}
    title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    className={`theme-switch${floating ? ' theme-switch--floating' : ''}`}
    onClick={event => toggle(event.currentTarget)}>
    <span className="theme-switch__sun" aria-hidden="true">☀</span>
    <span className="theme-switch__moon" aria-hidden="true">☾</span>
    <span className="theme-switch__thumb" aria-hidden="true" />
  </button>
}
