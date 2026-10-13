import { GlobalHeader } from './GlobalHeader'
import './shell.css'
import './header-layout.css'

/** Logged-in chrome: one header, category menu, and search for every product screen. */
export function AppShell() {
  return (
    <div className="hj-shell">
      <GlobalHeader />
    </div>
  )
}
