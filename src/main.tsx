import './bootstrap/preventDefaultGuard'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './ui-consistency.css'
import './ai-spectrum.css'
import './liquid-glass.css'
import './components/theme/dark-theme.css'
import { LiquidGlassEffects } from './components/ui/LiquidGlassEffects'

/**
 * Do NOT wrap the app in React.StrictMode while Google Maps Vector/WebGL is in use.
 * Strict Mode double-invokes effects in DEV: create map → destroy → create again.
 * That exhausts WebGL contexts and Google falls back to Raster ("Attempted to load a
 * Vector Map, but failed"), which is why maps.google.com stays smooth but this app lags.
 */
createRoot(document.getElementById('root')!).render(<><LiquidGlassEffects /><App /></>)
